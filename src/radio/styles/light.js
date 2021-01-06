import { changeColor } from 'seemly'
import commonVariables from './_common'
import { commonLight } from '../../_styles/new-common'

export default {
  name: 'Radio',
  common: commonLight,
  self (vars) {
    const {
      borderColor,
      primaryColor,
      baseColor,
      textColorDisabled,
      disabledBackgroundColor,
      textColor2,
      opacityDisabled,
      borderRadius,
      fontSizeSmall,
      fontSizeMedium,
      fontSizeLarge,
      heightSmall,
      heightMedium,
      heightLarge
    } = vars
    return {
      ...commonVariables,
      buttonHeightSmall: heightSmall,
      buttonHeightMedium: heightMedium,
      buttonHeightLarge: heightLarge,
      fontSizeSmall,
      fontSizeMedium,
      fontSizeLarge,
      boxShadow: `inset 0 0 0 1px ${borderColor}`,
      boxShadowActive: `inset 0 0 0 1px ${primaryColor}`,
      boxShadowFocus: `inset 0 0 0 1px ${primaryColor}, 0 0 0 2px ${changeColor(
        primaryColor,
        { alpha: 0.2 }
      )}`,
      boxShadowHover: `inset 0 0 0 1px ${primaryColor}`,
      boxShadowDisabled: `inset 0 0 0 1px ${borderColor}`,
      color: baseColor,
      colorDisabled: disabledBackgroundColor,
      textColor: textColor2,
      textColorDisabled: textColorDisabled,
      dotColorActive: primaryColor,
      dotColorDisabled: borderColor,
      buttonBorderColor: borderColor,
      buttonBorderColorActive: primaryColor,
      buttonBorderColorHover: borderColor,
      buttonColor: baseColor,
      buttonColorActive: baseColor,
      buttonTextColor: textColor2,
      buttonTextColorActive: primaryColor,
      buttonTextColorHover: primaryColor,
      opacityDisabled: opacityDisabled,
      buttonBoxShadowFocus: `inset 0 0 0 1px ${primaryColor}, 0 0 0 2px ${changeColor(
        primaryColor,
        { alpha: 0.3 }
      )}`,
      buttonBoxShadowHover: 'inset 0 0 0 1px transparent',
      buttonBoxShadow: 'inset 0 0 0 1px transparent',
      buttonBorderRadius: borderRadius
    }
  }
}
