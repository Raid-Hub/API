declare global {
    interface BigInt {
        toJSON(): string
    }
}

BigInt.prototype.toJSON = BigInt.prototype.toString

export {}
