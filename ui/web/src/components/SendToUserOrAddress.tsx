import { useState } from 'react'

import { Input } from './Input'

export default function SendToUserOrAddress() {
    const [value, setValue] = useState('')

    return (
        <>
            <Input value={value} onChange={e => setValue(e.target.value)} label="Username" />
        </>
    )
}
