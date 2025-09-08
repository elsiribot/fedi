import React from 'react'

import Header from '../../ui/Header'
import CommunitySelector from './CommunitySelector'

const PopupFederationEndedHeader: React.FC = () => {
    return <Header headerCenter={<CommunitySelector />} />
}

export default PopupFederationEndedHeader
