import amqplib from "amqplib"
import { afterAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test"
import { RabbitConnection } from "./connection"
import { RabbitQueue } from "./queue"

describe("RabbitQueue", () => {
    const mockAssertQueue = mock(() =>
        Promise.resolve({ queue: "test_queue", messageCount: 0, consumerCount: 0 })
    )
    const mockSendToQueue = mock(() => true)

    function makeMockChannel(onHandler?: (event: string, handler: unknown) => void) {
        return {
            assertQueue: mockAssertQueue,
            sendToQueue: mockSendToQueue,
            on: mock(onHandler ?? (() => {}))
        }
    }

    const mockCreateChannel = mock(() => Promise.resolve(makeMockChannel()))
    const mockConn = {
        createChannel: mockCreateChannel,
        on: mock(() => {}),
        close: mock(() => {})
    }

    const connectSpy = spyOn(amqplib, "connect")

    beforeEach(() => {
        connectSpy.mockReset()
        connectSpy.mockResolvedValue(mockConn as never)
        mockAssertQueue.mockClear()
        mockSendToQueue.mockClear()
        mockCreateChannel.mockClear()
        mockCreateChannel.mockResolvedValue(makeMockChannel())
    })

    afterAll(() => {
        connectSpy.mockRestore()
    })

    test("asserts queue topology when channel is first created", async () => {
        const connection = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        const queue = new RabbitQueue<number>({ queueName: "test_queue", connection })

        await queue.send(1)

        expect(mockAssertQueue).toHaveBeenCalledTimes(1)
        expect(mockAssertQueue).toHaveBeenCalledWith("test_queue", { durable: true })
    })

    test("sends message after topology assertion", async () => {
        const connection = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        const queue = new RabbitQueue<number>({ queueName: "test_queue", connection })

        await queue.send(42)

        expect(mockSendToQueue).toHaveBeenCalledTimes(1)
        expect(mockSendToQueue).toHaveBeenCalledWith(
            "test_queue",
            Buffer.from("42"),
            expect.objectContaining({ contentType: "text/plain" })
        )
    })

    test("reuses channel for multiple sends without re-asserting", async () => {
        const connection = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        const queue = new RabbitQueue<number>({ queueName: "test_queue", connection })

        await queue.send(1)
        await queue.send(2)
        await queue.send(3)

        expect(mockAssertQueue).toHaveBeenCalledTimes(1)
        expect(mockSendToQueue).toHaveBeenCalledTimes(3)
    })

    test("re-asserts queue topology after channel loss", async () => {
        let closeHandler: (() => void) | undefined
        mockCreateChannel.mockResolvedValue(
            makeMockChannel((event, handler) => {
                if (event === "close") closeHandler = handler as () => void
            })
        )

        const connection = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        const queue = new RabbitQueue<number>({ queueName: "test_queue", connection })

        await queue.send(1)
        expect(mockAssertQueue).toHaveBeenCalledTimes(1)

        // Simulate channel close
        closeHandler?.()

        await queue.send(2)
        expect(mockAssertQueue).toHaveBeenCalledTimes(2)
        expect(mockSendToQueue).toHaveBeenCalledTimes(2)
    })

    test("sends JSON objects", async () => {
        const connection = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        const queue = new RabbitQueue<{ id: number }>({ queueName: "test_queue", connection })

        await queue.sendJson({ id: 99 })

        expect(mockSendToQueue).toHaveBeenCalledWith(
            "test_queue",
            Buffer.from(JSON.stringify({ id: 99 })),
            expect.objectContaining({ contentType: "application/json" })
        )
    })

    test("concurrent sends share a single channel creation", async () => {
        const connection = new RabbitConnection({ user: "guest", password: "guest", port: 5672 })
        const queue = new RabbitQueue<number>({ queueName: "test_queue", connection })

        await Promise.all([queue.send(1), queue.send(2), queue.send(3)])

        expect(mockAssertQueue).toHaveBeenCalledTimes(1)
        expect(mockSendToQueue).toHaveBeenCalledTimes(3)
    })
})
