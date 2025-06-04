import { create as createQrCode } from 'qrcode'
import { SvgXml } from 'react-native-svg'

import { renderStyledQrSvg } from '@fedi/common/utils/qrcode'

interface Props {
    value: string
    size: number
    logoOverrideUrl?: string
}

const QRCode: React.FC<Props> = ({ value, size, logoOverrideUrl }) => {
    return (
        <SvgXml
            xml={renderStyledQrSvg(createQrCode(value), {
                moduleShape: 'dot',
                hideLogo: false,
                logoOverrideUrl,
            })}
            width={size}
            height={size}
        />
    )
}

export default QRCode
