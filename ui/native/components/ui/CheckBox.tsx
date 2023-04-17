import {
    CheckBox as CheckBoxRNE,
    CheckBoxProps as CheckBoxRNEProps,
} from '@rneui/themed'
import React from 'react'

import SvgImage from './SvgImage'

type CheckBoxProps = CheckBoxRNEProps

const CheckBox: React.FC<CheckBoxProps> = ({
    checked,
    checkedIcon = <SvgImage name="CheckboxChecked" />,
    uncheckedIcon = <SvgImage name="CheckboxUnchecked" />,
    title,
    // TODO: apply these colors to the SvgImage.color if defined
    checkedColor,
    uncheckedColor,
    onPress,
}: CheckBoxProps) => {
    return (
        <CheckBoxRNE
            checked={checked}
            checkedIcon={checkedIcon}
            uncheckedIcon={uncheckedIcon}
            {...(title && { title })}
            {...(checkedColor && { checkedColor })}
            {...(uncheckedColor && { uncheckedColor })}
            {...(onPress && { onPress })}
        />
    )
}

export default CheckBox
