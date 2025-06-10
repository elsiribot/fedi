import { TestEnvironment } from 'jest-environment-node'

export default class extends TestEnvironment {
    constructor(config, context) {
        super(config, context)

        // Assigns Jest's custom global error types to those of node
        // Necessary for `instanceof Error` checks to work properly
        this.global.Error = Error
        this.global.TypeError = TypeError
        this.global.SyntaxError = SyntaxError
        this.global.URIError = URIError
        this.global.RangeError = RangeError
    }
}
