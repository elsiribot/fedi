import React from 'react'
import { FediLogoSvg } from '../../../assets/images/svgs'

import Header from '../../ui/Header'

const EulaHeader: React.FC<{}> = () => {
    return (
        <Header
            backButton
            headerCenter={
                <FediLogoSvg height={20} width={100} />
                // <Image
                //     style={{ width: 100, height: 20 }}
                //     source={Images.FediLogo}
                //     resizeMode="contain"
                // />
            }
        />
    )
}

export default EulaHeader
