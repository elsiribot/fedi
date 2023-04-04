declare module '*.svg' {
    import { FunctionComponent, SVGAttributes } from 'react'
    const value: React.FunctionComponent<React.SVGAttributes<SVGElement>>
    export = value
}
