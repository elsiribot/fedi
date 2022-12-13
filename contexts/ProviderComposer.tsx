import React from 'react'

interface Props {
    providers: Array<
        React.JSXElementConstructor<React.PropsWithChildren<unknown>>
    >
    children: React.ReactNode
}

export default function ProviderComposer(props: Props) {
    const { providers = [], children } = props

    return (
        <>
            {providers.reduceRight((acc, Provider) => {
                return <Provider>{acc}</Provider>
            }, children)}
        </>
    )
}
