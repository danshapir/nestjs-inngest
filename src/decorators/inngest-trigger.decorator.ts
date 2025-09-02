// This file previously contained redundant trigger decorators that have been removed
// since @InngestCron and @InngestEvent decorators already provide clean, direct ways
// to define function triggers.
//
// The decorators @InngestTrigger, @Cron, @OnEvent, and @OnEvents were
// redundant because:
// 1. @InngestCron(id, cron, options) is cleaner than @Cron + @InngestFunction  
// 2. @InngestEvent(id, event, options) is cleaner than @OnEvent + @InngestFunction
// 3. Multiple events can be handled with separate functions or array syntax in trigger config
//
// Use the existing decorators instead:
//
// @InngestCron('my-job', '0 9 * * *')  // Daily at 9 AM
// async dailyTask({ event, step, ctx }) { }
//
// @InngestEvent('handle-user', 'user.created')
// async handleUser({ event, step, ctx }) { }
//
// @InngestFunction({
//   id: 'multi-event',
//   trigger: [{ event: 'user.created' }, { event: 'user.updated' }]
// })
// async handleMultipleEvents({ event, step, ctx }) { }