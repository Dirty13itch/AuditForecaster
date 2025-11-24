import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextEncoder, TextDecoder });

// Polyfill Request, Response, Headers for Next.js cache
if (typeof global.Request === 'undefined') {
    global.Request = class Request {
        constructor(input, init) {
            this.url = input;
            this.method = init?.method || 'GET';
            this.headers = new Headers(init?.headers);
        }
    };
}

if (typeof global.Response === 'undefined') {
    global.Response = class Response {
        constructor(body, init) {
            this.status = init?.status || 200;
            this.ok = this.status >= 200 && this.status < 300;
        }
    };
}

if (typeof global.Headers === 'undefined') {
    global.Headers = class Headers {
        constructor(init) {
            this.map = new Map(Object.entries(init || {}));
        }
        get(name) { return this.map.get(name); }
        set(name, value) { this.map.set(name, value); }
    };
}

jest.mock('next/navigation', () => ({
    redirect: jest.fn(() => { throw new Error('NEXT_REDIRECT'); }),
    notFound: jest.fn(),
    usePathname: jest.fn(),
    useRouter: jest.fn(() => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    })),
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

jest.mock('lucide-react', () => ({
    Loader2: () => <div data-testid="loader" />,
    Wifi: () => <div />,
    WifiOff: () => <div />,
    Save: () => <div />,
    PlusCircle: () => <div />,
    Calendar: () => <div />,
    MapPin: () => <div />,
    Search: () => <div />,
    Plus: () => <div />,
    Edit: () => <div />,
    Trash2: () => <div />,
    CheckCircle: () => <div />,
    ChevronRight: () => <div />,
    ChevronDown: () => <div />,
    FileText: () => <div />,
    LogOut: () => <div />,
    Settings: () => <div />,
    User: () => <div />,
    Users: () => <div />,
    Truck: () => <div />,
    Wrench: () => <div />,
    Home: () => <div />,
    LayoutDashboard: () => <div />,
}));
