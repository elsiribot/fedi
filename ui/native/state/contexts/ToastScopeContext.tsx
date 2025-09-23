import React, { createContext, useContext } from 'react'

type ToastScope = 'global' | 'overlay'

const ToastScopeContext = createContext<ToastScope>('global')

export const ToastScopeProvider = ({
    value,
    children,
}: {
    value: ToastScope
    children: React.ReactNode
}) => (
    <ToastScopeContext.Provider value={value}>
        {children}
    </ToastScopeContext.Provider>
)

export const useToastScope = () => useContext(ToastScopeContext)
