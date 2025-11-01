# WebSocket Scaling Guide

## Current Architecture

### Overview
The application uses WebSocket connections for real-time notifications and updates. The current implementation is optimized for single-server deployments with in-memory connection tracking.

**Key Components:**
- **Server**: Node.js Express application with `ws` library
- **Connection Management**: In-memory Map storing user connections
- **Broadcasting**: Direct iteration over connected clients
- **Authentication**: Session-based authentication integrated with Express

### Connection Flow

```
Client → HTTP Upgrade Request → WebSocket Handshake → Authenticated Connection
                                                            ↓
                                            Store connection in memory
                                                            ↓
                                            Receive/Send messages
```

### Current Implementation Details

**File**: `server/websocket.ts`

**Connection Tracking:**
```typescript
// In-memory connection storage
const connections = new Map<string, Set<WebSocket>>();

// Multiple connections per user supported
export function addConnection(userId: string, ws: WebSocket) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(ws);
}
```

**Broadcasting:**
```typescript
// Broadcast to specific user (all their connections)
export function sendToUser(userId: string, message: any) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}

// Broadcast to all connected users
export function broadcastToAll(message: any) {
  connections.forEach((userConnections) => {
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  });
}
```

### Strengths of Current Architecture
- ✅ Simple, reliable, low-latency for single-server
- ✅ No external dependencies (Redis, message queues)
- ✅ Direct integration with Express sessions
- ✅ Multiple connections per user supported
- ✅ Automatic cleanup on disconnect

### Limitations
- ❌ Not horizontally scalable (connections tied to specific server instance)
- ❌ No load balancing support without sticky sessions
- ❌ No cross-server message broadcasting
- ❌ Connection capacity limited to single server resources

## Scaling Strategies

### Option 1: Sticky Sessions (Recommended for 2-5 servers)

**Best for**: Small to medium horizontal scaling (2-5 application servers)

**How it works:**
- Load balancer routes user to same server based on session ID
- WebSocket connections remain on assigned server
- Simple to implement with existing architecture

**Implementation:**

#### Nginx Configuration
```nginx
upstream backend {
    ip_hash;  # Route based on client IP
    server app1.example.com:3000;
    server app2.example.com:3000;
    server app3.example.com:3000;
}

server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

#### HAProxy Configuration
```haproxy
frontend http_front
    bind *:80
    default_backend app_servers

backend app_servers
    balance source  # Sticky sessions based on source IP
    option forwardfor
    server app1 app1.example.com:3000 check
    server app2 app2.example.com:3000 check
    server app3 app3.example.com:3000 check
```

**Pros:**
- ✅ Minimal code changes required
- ✅ Works with existing in-memory architecture
- ✅ Simple to configure
- ✅ No external dependencies

**Cons:**
- ❌ Uneven load distribution if some users are more active
- ❌ Server restart disconnects all users on that server
- ❌ Limited by capacity of sticky session algorithm

---

### Option 2: Redis Pub/Sub (Recommended for 5+ servers)

**Best for**: Large horizontal scaling (5+ application servers)

**How it works:**
- WebSocket connections distributed across all servers
- Redis used as message broker for cross-server communication
- Any server can notify any user, regardless of connection server

**Architecture Diagram:**
```
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   Server 1  │        │   Server 2  │        │   Server 3  │
│  (Users A,B)│        │  (Users C,D)│        │  (Users E,F)│
└──────┬──────┘        └──────┬──────┘        └──────┬──────┘
       │                      │                      │
       └──────────────┬───────┴──────────────────────┘
                      │
              ┌───────▼────────┐
              │  Redis Pub/Sub │
              │   (Message     │
              │    Broker)     │
              └────────────────┘
```

**Implementation Steps:**

#### 1. Add Redis Dependency
```bash
npm install redis ioredis
npm install --save-dev @types/ioredis
```

#### 2. Create Redis Client (`server/redis.ts`)
```typescript
import Redis from 'ioredis';
import { serverLogger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisPublisher = new Redis(redisUrl, {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

export const redisSubscriber = new Redis(redisUrl, {
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redisPublisher.on('connect', () => {
  serverLogger.info('[Redis] Publisher connected');
});

redisPublisher.on('error', (err) => {
  serverLogger.error('[Redis] Publisher error', { error: err });
});

redisSubscriber.on('connect', () => {
  serverLogger.info('[Redis] Subscriber connected');
});

redisSubscriber.on('error', (err) => {
  serverLogger.error('[Redis] Subscriber error', { error: err });
});
```

#### 3. Update WebSocket Handler (`server/websocket.ts`)
```typescript
import { redisPublisher, redisSubscriber } from './redis';

// Subscribe to notification channel on startup
const NOTIFICATION_CHANNEL = 'websocket:notifications';

redisSubscriber.subscribe(NOTIFICATION_CHANNEL, (err) => {
  if (err) {
    serverLogger.error('[WebSocket] Failed to subscribe to Redis', { error: err });
  } else {
    serverLogger.info('[WebSocket] Subscribed to Redis notification channel');
  }
});

// Handle incoming messages from Redis
redisSubscriber.on('message', (channel, message) => {
  if (channel === NOTIFICATION_CHANNEL) {
    try {
      const notification = JSON.parse(message);
      
      // Check if this user is connected to THIS server
      const userConnections = connections.get(notification.userId);
      
      if (userConnections) {
        userConnections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(notification.data));
          }
        });
      }
    } catch (error) {
      serverLogger.error('[WebSocket] Error processing Redis message', { error });
    }
  }
});

// Modified sendToUser - publishes to Redis
export async function sendToUser(userId: string, message: any) {
  const notification = {
    userId,
    data: message,
    timestamp: Date.now(),
  };
  
  try {
    // Publish to Redis - all servers will receive this
    await redisPublisher.publish(
      NOTIFICATION_CHANNEL,
      JSON.stringify(notification)
    );
  } catch (error) {
    serverLogger.error('[WebSocket] Failed to publish to Redis', { error });
  }
}

// Modified broadcastToAll - publishes to Redis
export async function broadcastToAll(message: any) {
  try {
    // Get all connected user IDs across all servers
    const notification = {
      type: 'broadcast',
      data: message,
      timestamp: Date.now(),
    };
    
    await redisPublisher.publish(
      NOTIFICATION_CHANNEL,
      JSON.stringify(notification)
    );
  } catch (error) {
    serverLogger.error('[WebSocket] Failed to broadcast via Redis', { error });
  }
}
```

**Pros:**
- ✅ True horizontal scaling to unlimited servers
- ✅ Even load distribution
- ✅ Server restart only affects users on that server
- ✅ Cross-server message broadcasting

**Cons:**
- ❌ Requires Redis infrastructure
- ❌ More complex architecture
- ❌ Additional operational overhead (Redis monitoring, failover)

---

### Option 3: Socket.IO with Redis Adapter

**Best for**: Simplified scaling with automatic reconnection

Socket.IO provides built-in scaling with Redis adapter and additional features like automatic reconnection.

**Implementation:**

```bash
npm install socket.io socket.io-redis ioredis
```

```typescript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPublisher, redisSubscriber } from './redis';

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    credentials: true,
  },
});

// Use Redis adapter for scaling
io.adapter(createAdapter(redisPublisher, redisSubscriber));

io.use((socket, next) => {
  // Authenticate using session
  const session = socket.request.session;
  if (session && session.userId) {
    socket.userId = session.userId;
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  
  // Join user-specific room
  socket.join(`user:${userId}`);
  
  serverLogger.info('[WebSocket] User connected', { userId });
  
  socket.on('disconnect', () => {
    serverLogger.info('[WebSocket] User disconnected', { userId });
  });
});

// Send to specific user
export function sendToUser(userId: string, message: any) {
  io.to(`user:${userId}`).emit('notification', message);
}

// Broadcast to all
export function broadcastToAll(message: any) {
  io.emit('notification', message);
}
```

**Pros:**
- ✅ Built-in reconnection logic
- ✅ Automatic scaling with Redis adapter
- ✅ Fallback transports (long-polling if WebSocket fails)
- ✅ Rich ecosystem and documentation

**Cons:**
- ❌ Larger library footprint
- ❌ Requires client-side library change
- ❌ More opinionated architecture

---

## Performance Considerations

### Connection Limits

**Single Server Capacity:**
- **Theoretical Max**: ~65,000 connections (OS limit on file descriptors)
- **Practical Max**: 10,000-20,000 concurrent connections per server
- **Recommended Max**: 5,000-10,000 for optimal performance

**Factors Affecting Capacity:**
- Memory: ~10KB per connection (Node.js overhead)
- CPU: Message broadcasting scales linearly with connection count
- Network bandwidth: Depends on message frequency and size

### Optimization Tips

#### 1. Message Batching
```typescript
// Instead of sending 100 individual messages
for (const update of updates) {
  sendToUser(userId, update);  // ❌ 100 Redis operations
}

// Batch into one message
sendToUser(userId, { type: 'batch', updates });  // ✅ 1 Redis operation
```

#### 2. Connection Pooling (Redis)
```typescript
const redisPublisher = new Redis(redisUrl, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  connectionName: 'ws-publisher',
});
```

#### 3. Heartbeat/Ping Configuration
```typescript
// Keep connections alive but reduce overhead
const wss = new WebSocketServer({
  server: httpServer,
  clientTracking: true,
  perMessageDeflate: false,  // Disable compression for lower CPU
});

// Custom ping interval
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);  // 30 seconds
```

---

## Monitoring and Troubleshooting

### Key Metrics to Track

1. **Connection Count**
   ```typescript
   export function getConnectionCount(): number {
     let count = 0;
     connections.forEach(userConns => {
       count += userConns.size;
     });
     return count;
   }
   ```

2. **Message Latency**
   ```typescript
   const startTime = Date.now();
   sendToUser(userId, { type: 'ping', timestamp: startTime });
   // Client echoes back, measure round-trip time
   ```

3. **Failed Deliveries**
   ```typescript
   let failedDeliveries = 0;
   
   userConnections.forEach(ws => {
     if (ws.readyState !== WebSocket.OPEN) {
       failedDeliveries++;
     }
   });
   ```

### Common Issues

#### Issue: "WebSocket connection closed unexpectedly"
**Causes:**
- Proxy timeout too short
- Client network interruption
- Server restart

**Solutions:**
- Increase proxy timeout (nginx: `proxy_read_timeout`)
- Implement client-side reconnection logic
- Use heartbeat/ping to keep connections alive

#### Issue: "Messages not received across servers"
**Causes:**
- Redis connection failure
- Subscription not established
- Message format errors

**Solutions:**
- Check Redis connectivity
- Monitor Redis subscription status
- Add error handling and retry logic

#### Issue: "High memory usage"
**Causes:**
- Connection leaks (not cleaning up disconnects)
- Large message payloads
- Too many connections per server

**Solutions:**
- Ensure proper cleanup on disconnect
- Reduce message size, paginate large updates
- Scale horizontally with load balancing

---

## Health Checks

### WebSocket Health Endpoint

```typescript
app.get('/health/websocket', (req, res) => {
  const totalConnections = getConnectionCount();
  const connectedUsers = connections.size;
  
  res.json({
    healthy: true,
    connections: {
      total: totalConnections,
      users: connectedUsers,
    },
    timestamp: new Date().toISOString(),
  });
});
```

### Redis Health Check (if using Redis)

```typescript
app.get('/health/redis', async (req, res) => {
  try {
    await redisPublisher.ping();
    res.json({
      healthy: true,
      redis: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      healthy: false,
      redis: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
```

---

## Deployment Recommendations

### Single Server (Current)
- **Use Cases**: Development, small teams (<50 concurrent users)
- **No changes needed**: Current architecture is optimal
- **Monitor**: Connection count, memory usage

### 2-5 Servers
- **Recommended**: Sticky Sessions (Option 1)
- **Setup**: Nginx/HAProxy with IP hash or cookie-based routing
- **Migration**: No code changes required

### 5+ Servers
- **Recommended**: Redis Pub/Sub (Option 2) or Socket.IO (Option 3)
- **Setup**: Redis cluster for high availability
- **Migration**: Moderate code changes required

### High Availability
- **Load Balancer**: Multiple instances for failover
- **Redis**: Sentinel or Cluster mode
- **Application Servers**: Auto-scaling group with health checks

---

## Migration Checklist

### Pre-Migration
- [ ] Measure current connection count and patterns
- [ ] Identify peak usage times
- [ ] Document current message types and frequencies
- [ ] Set up monitoring dashboards

### Migration (Redis Pub/Sub)
- [ ] Add Redis to infrastructure
- [ ] Install Redis client library
- [ ] Create Redis client module
- [ ] Update `websocket.ts` with Redis pub/sub
- [ ] Test in staging environment
- [ ] Monitor for message delivery issues
- [ ] Deploy to production with gradual rollout

### Post-Migration
- [ ] Verify cross-server message delivery
- [ ] Monitor Redis performance
- [ ] Test server restart scenarios
- [ ] Document runbooks for common issues

---

## Conclusion

**Current State**: Optimized for single-server deployment with low latency and simplicity.

**Recommended Path**:
1. **Start**: Single server (current)
2. **2-5 servers**: Add sticky sessions (minimal changes)
3. **5+ servers**: Migrate to Redis Pub/Sub (moderate changes)
4. **High traffic**: Consider Socket.IO for additional features

**Key Takeaway**: The current architecture is production-ready for single-server deployments. Scale horizontally only when needed, starting with sticky sessions for simplicity.
