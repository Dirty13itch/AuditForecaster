import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import { ReadableStream } from 'stream/web'

Object.assign(global, { TextEncoder, TextDecoder, ReadableStream })

const Request = class Request {
    url: string;
    method: string;
    headers: Headers;
    constructor(input: any, init: any) {
        this.url = input;
        this.method = init?.method || 'GET';
        this.headers = new Headers(init?.headers);
    }
}

const Headers = class Headers {
    map: Map<string, string>;
    constructor(init: any) {
        this.map = new Map();
    }
    get(name: string) { return this.map.get(name) || null }
    set(name: string, value: string) { this.map.set(name, value) }
    append(name: string, value: string) { this.map.set(name, value) }
    delete(name: string) { this.map.delete(name) }
    has(name: string) { return this.map.has(name) }
    forEach(callback: any) { this.map.forEach(callback) }
    entries() { return this.map.entries() }
    keys() { return this.map.keys() }
    values() { return this.map.values() }
    getSetCookie() { return [] }
    [Symbol.iterator]() { return this.map.entries() }
}

const Response = class Response {
    constructor(body: any, init: any) { }
}

Object.assign(global, { Request, Response, Headers })

jest.mock('lucide-react', () => {
    return new Proxy({}, {
        get: (target, prop) => {
            const Icon = () => String(prop);
            Icon.displayName = String(prop);
            return Icon;
        }
    })
})
