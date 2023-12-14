import { styled } from '@stitches/react'
import * as React from 'react'

import Close from '@fedi/common/assets/svgs/close.svg'

import { theme } from '../../styles'
import { Icon } from '../Icon'
import { FileData } from './FileUploader'

type FilePreviewProps = {
    fileData: FileData
    onRemove: (id: string) => void
}

export const FilePreview: React.FC<FilePreviewProps> = ({
    fileData,
    onRemove,
}) => {
    return (
        <Container style={{ backgroundImage: `url(${fileData.preview})` }}>
            <CloseButton onClick={() => onRemove(fileData.id)}>
                <Icon icon={Close} size="xs" />
            </CloseButton>
        </Container>
    )
}

const Container = styled('div', {
    position: 'relative',
    borderRadius: theme.space.xs,
    width: 44,
    height: 44,
    backgroundColor: theme.colors.extraLightGrey,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
})

const CloseButton = styled('button', {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: theme.space.lg,
    diplay: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.black,
    color: theme.colors.white,
})
