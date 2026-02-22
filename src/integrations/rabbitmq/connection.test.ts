import amqplib from "amqplib"
import { afterAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test"
import { RabbitConnection, jitteredDelay } from "./connection"

describe("jitteredDelay", () => {
    test("returns a value between 50% and 100% of the exponential delay", () => {
        for (let attempt = 0; attempt < 5; attempt++) {
            const delay = jitteredDelay(attempt)
            const exponential = Math.min(1000 * 2 ** attempt, 30_000)
            expect(delay).toBeGreaterThanOrEqual(exponential * 0.5)
            expect(delay).toBeLessThanOrEqual(exponential)
        }
    })

    test("caps at MAX_RETRY_DELAY_MS", () => {
        const delay = jitteredDelay(100)
        expect(delay).toBeLessThanOrEqual(30_000)
    })
})

describe("RabbitConnection", () => {
    const mockChannel = { on: mock(() => {}) }
    const mockCreateChannel = mock(() => Promise.resolve(mockChannel))

    function makeMockConn(onHandler?: (event: string, handler: unknown) => void) {
        return {
            createChannel: mockCreateChannel,
            on: mock(onHandler ?? (() => {})),
            close: mock(() => {})
        }
    }

    const connectSpy = spyOn(amqplib, "connect")

    beforeEach(() => {
        connectSpy.mockReset()
        mockCreateChannel.mockClear()
        mockCreateChannel.mockResolvedValue(mockChannel)
    })

    afterAll(() => {
        connectSpy.mockRestore()
    })

    test("createChannel connects and returns a channel", async () => {
        connectSpy.mockResolvedValueOnce(makeMockConn() as never)

        const rabbit = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        const channel = await rabbit.createChannel()

        expect(connectSpy).toHaveBeenCalledTimes(1)
        expect(channel).toBe(mockChannel as never)
    })

    test("concurrent createChannel calls share a single connect attempt", async () => {
        connectSpy.mockResolvedValueOnce(makeMockConn() as never)

        const rabbit = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        const [ch1, ch2] = await Promise.all([rabbit.createChannel(), rabbit.createChannel()])

        expect(connectSpy).toHaveBeenCalledTimes(1)
        expect(ch1).toBe(mockChannel as never)
        expect(ch2).toBe(mockChannel as never)
    })

    test("reconnects automatically after connection close event", async () => {
        let closeHandler: (() => void) | undefined
        const firstConn = makeMockConn((event, handler) => {
            if (event === "close") closeHandler = handler as () => void
        })
        const secondConn = makeMockConn()

        connectSpy
            .mockResolvedValueOnce(firstConn as never)
            .mockResolvedValueOnce(secondConn as never)

        const rabbit = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        await rabbit.createChannel()
        expect(connectSpy).toHaveBeenCalledTimes(1)

        // Simulate connection drop
        closeHandler?.()

        // Wait for async reconnect to initiate
        await new Promise(resolve => setTimeout(resolve, 0))

        // The reconnect promise is now in-flight; await createChannel which waits for it
        await rabbit.createChannel()
        expect(connectSpy).toHaveBeenCalledTimes(2)
    })

    test("$disconnect sets destroyed flag preventing future reconnects", async () => {
        let closeHandler: (() => void) | undefined
        const conn = makeMockConn((event, handler) => {
            if (event === "close") closeHandler = handler as () => void
        })
        connectSpy.mockResolvedValueOnce(conn as never)

        const rabbit = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        await rabbit.createChannel()

        rabbit.$disconnect()
        closeHandler?.()

        await new Promise(resolve => setTimeout(resolve, 0))

        // No additional connect call should have been made after destroy
        expect(connectSpy).toHaveBeenCalledTimes(1)
    })
})
