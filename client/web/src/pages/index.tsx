import React from 'react'
import dateUtils from '@fedi/common/utils/DateUtils'

function HomePage() {
    return (
        <div>
            Fedi web, the time is {dateUtils.formatTimestamp(Date.now() / 1000)}
        </div>
    )
}

export default HomePage
