// This file previously contained parameter injection decorators that have been removed
// in favor of the cleaner object destructuring approach: { event, step, ctx }
//
// The decorators @Step, @Event, @Context, and @UseParameterInjection were
// placeholder implementations that returned null and added unnecessary complexity.
//
// Use object destructuring in your Inngest function handlers instead:
//
// @InngestFunction({ id: 'my-function', trigger: { event: 'test' } })
// async myFunction({ event, step, ctx }) {
//   // Access event, step, and ctx directly
// }
