import React, { useState } from 'react'

import cogIcon from '@fedi/common/assets/svgs/cog.svg'

import { Button } from '../../components/Button'
import { styled } from '../../styles'
import { Dialog } from '../Dialog'
import { Input } from '../Input'
import { RadioGroup } from '../RadioGroup'

const sizes = ['sm', 'md', 'lg'] as const
type Size = (typeof sizes)[number]

export const DialogDemo: React.FC = () => {
    const [open, setOpen] = useState(false)
    const [size, setSize] = useState<Size>('sm')
    const [value1, setValue1] = useState('')
    const [value2, setValue2] = useState('')

    return (
        <Container>
            <RadioGroup
                options={sizes.map(s => ({ value: s, label: s }))}
                value={size}
                onChange={s => setSize(s as Size)}
            />
            <Button onClick={() => setOpen(true)}>Open a Dialog</Button>
            <Dialog
                title="Dialog title"
                description="This is a description for the dialog."
                size={size}
                open={open}
                onOpenChange={setOpen}>
                <Form
                    onSubmit={ev => {
                        ev.preventDefault()
                        setOpen(false)
                    }}>
                    <Input
                        label="Field one"
                        value={value1}
                        onChange={ev => setValue1(ev.currentTarget.value)}
                    />

                    <Input
                        label="Field two"
                        value={value2}
                        onChange={ev => setValue2(ev.currentTarget.value)}
                    />
                    <Actions>
                        <Button type="submit">Save</Button>
                        <Button type="submit" variant="tertiary">
                            Cancel
                        </Button>
                    </Actions>
                </Form>
            </Dialog>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 320,
    gap: 10,
})

const Form = styled('form', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})

const Actions = styled('div', {
    display: 'flex',
    gap: 8,
})
