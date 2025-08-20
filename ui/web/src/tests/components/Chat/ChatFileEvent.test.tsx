import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'

import { mockMatrixEventFile } from '@fedi/common/tests/mock-data/matrix-event'

import { ChatFileEvent } from '../../../components/Chat/ChatFileEvent'
import { downloadFile } from '../../../utils/media'

jest.mock('../../../hooks/media', () => ({
    ...jest.requireActual('../../../hooks/media'),
    useLoadMedia: () => ({
        src: '/test-url',
        loading: false,
        error: false,
    }),
}))

jest.mock('../../../utils/media', () => ({
    downloadFile: jest.fn(),
}))

describe('/components/Chat/ChatImageEvent', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('when the component is rendered', () => {
        it('should display file event', async () => {
            render(<ChatFileEvent event={mockMatrixEventFile} />)

            expect(screen.getByLabelText('file')).toBeInTheDocument()
            expect(screen.getByText('test-file.pdf')).toBeInTheDocument()
            expect(screen.getByText('9.8 KB')).toBeInTheDocument()
        })
    })

    describe('when the download button is clicked', () => {
        it('should call the download function', async () => {
            render(<ChatFileEvent event={mockMatrixEventFile} />)

            const downloadButton = screen.getByLabelText('download-button')

            downloadButton.click()

            expect(downloadFile).toHaveBeenCalledWith(
                '/test-url',
                'test-file.pdf',
            )
        })
    })
})
