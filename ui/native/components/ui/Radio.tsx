import {
    CheckBox as CheckBoxRNE,
    CheckBoxProps as CheckBoxRNEProps,
} from '@rneui/themed'
import React from 'react'

import SvgImage from './SvgImage'

type CheckBoxProps = Omit<CheckBoxRNEProps, 'children'>

const Radio: React.FC<CheckBoxProps> = ({
    checkedIcon = <SvgImage name="RadioSelected" />,
    uncheckedIcon = <SvgImage name="RadioUnselected" />,
    ...props
}: CheckBoxProps) => {
    return (
        <CheckBoxRNE
            checkedIcon={checkedIcon}
            uncheckedIcon={uncheckedIcon}
            {...props}
        />
    )
}

export default Radio
