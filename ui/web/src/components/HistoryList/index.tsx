import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'

import { styled, theme } from '../../styles'
import { HoloLoader } from '../HoloLoader'
import { Text } from '../Text'
import {
    HistoryDetailDialog,
    HistoryDetailDialogProps,
} from './HistoryDetailDialog'
import { HistoryRow, HistoryRowProps } from './HistoryRow'
import { HistoryRowError } from './HistoryRowError'

interface Props<T extends { id: string }> {
    rows: T[]
    loading?: boolean
    makeRowProps: (item: T) => Omit<HistoryRowProps, 'icon' | 'onSelect'>
    makeDetailProps: (
        item: T,
    ) => Omit<HistoryDetailDialogProps, 'icon' | 'onClose'>
    makeIcon: (item: T) => React.ReactNode
    onEndReached?: () => void
}

export function HistoryList<T extends { id: string }>({
    rows,
    loading,
    makeRowProps,
    makeDetailProps,
    makeIcon,
}: Props<T>): React.ReactElement {
    const { t } = useTranslation()
    const [selectedItem, setSelectedItem] = useState<T | null>(null)

    if (loading) {
        return (
            <Loading>
                <HoloLoader size="xl" />
            </Loading>
        )
    }

    if (!rows.length) {
        return (
            <EmptyState>
                <Text>{t('phrases.no-transactions')}</Text>
            </EmptyState>
        )
    }

    return (
        <Container>
            {rows.map(item => (
                <ErrorBoundary
                    key={item.id}
                    fallback={({ error }) => (
                        <HistoryRowError item={item} error={error} />
                    )}>
                    <HistoryRow
                        {...makeRowProps(item)}
                        icon={makeIcon(item)}
                        onSelect={() => setSelectedItem(item)}
                    />
                </ErrorBoundary>
            ))}
            {selectedItem && (
                <HistoryDetailDialog
                    {...makeDetailProps(selectedItem)}
                    icon={makeIcon(selectedItem)}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </Container>
    )
}

const Loading = styled('div', {
    padding: '48px 16px 16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
})

const EmptyState = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px 16px',
    textAlign: 'center',
    color: theme.colors.darkGrey,
    fontSize: theme.fontSizes.h2,
    border: `1px dashed ${theme.colors.lightGrey}`,
    borderRadius: 16,

    '@sm': {
        margin: '0 16px',
        border: 'none',
    },
})

const Container = styled('div', {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',

    variants: {
        centered: {
            true: {
                justifyContent: 'center',
                alignItems: 'center',
            },
        },
    },
})
