import { BaseApp } from '@zeppos/zml/base-app'
import { log as Logger } from '@zos/utils'

const logger = Logger.getLogger('RideNav-Device')
App(BaseApp({
  globalData: { connected: false },
  onCreate() { logger.log('[RideNav][Device] started') },
  onDestroy() { logger.log('[RideNav][Device] stopped') }
}))
