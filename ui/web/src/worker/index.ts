// Comment me out if you want Workbox logging
;(self as any).__WB_DISABLE_DEV_LOGS = true

self.addEventListener('message', ev => {
    console.info('I got a message', ev)
})
