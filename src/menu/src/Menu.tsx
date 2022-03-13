import {
  h,
  ref,
  toRef,
  computed,
  defineComponent,
  provide,
  PropType,
  ExtractPropTypes,
  inject,
  VNodeChild,
  watchEffect
} from 'vue'
import { createTreeMate, Key } from 'treemate'
import { useCompitable, useMergedState } from 'vooks'
import { useConfig, useTheme, useThemeClass } from '../../_mixins'
import type { ThemeProps } from '../../_mixins'
import { call } from '../../_utils'
import type { MaybeArray } from '../../_utils'
import { itemRenderer } from './utils'
import { menuLight } from '../styles'
import type { MenuTheme } from '../styles'
import style from './styles/index.cssr'
import {
  MenuOption,
  MenuGroupOption,
  MenuIgnoredOption,
  MenuMixedOption,
  OnUpdateValue,
  OnUpdateKeys,
  OnUpdateValueImpl,
  OnUpdateKeysImpl
} from './interface'
import { layoutSiderInjectionKey } from '../../layout/src/interface'
import { FollowerPlacement } from 'vueuc'
import { DropdownProps } from '../../dropdown'
import { useCheckDeprecated } from './useCheckDeprecated'
import { menuInjectionKey } from './context'

const menuProps = {
  ...(useTheme.props as ThemeProps<MenuTheme>),
  options: {
    type: Array as PropType<MenuMixedOption[]>,
    default: () => []
  },
  collapsed: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined
  },
  collapsedWidth: {
    type: Number,
    default: 48
  },
  iconSize: {
    type: Number,
    default: 20
  },
  collapsedIconSize: {
    type: Number,
    default: 24
  },
  rootIndent: Number,
  indent: {
    type: Number,
    default: 32
  },
  labelField: {
    type: String,
    default: 'label'
  },
  keyField: {
    type: String,
    default: 'key'
  },
  childrenField: {
    type: String,
    default: 'children'
  },
  defaultExpandAll: Boolean,
  defaultExpandedKeys: Array as PropType<Key[]>,
  expandedKeys: Array as PropType<Key[]>,
  value: [String, Number] as PropType<Key | null>,
  defaultValue: {
    type: [String, Number] as PropType<Key | null>,
    default: null
  },
  mode: {
    type: String as PropType<'vertical' | 'horizontal'>,
    default: 'vertical'
  },
  watchProps: {
    type: Array as PropType<Array<'defaultExpandedKeys' | 'defaultValue'>>,
    default: undefined
  },
  disabled: Boolean,
  inverted: Boolean,
  'onUpdate:expandedKeys': [Function, Array] as PropType<
  MaybeArray<OnUpdateKeys>
  >,
  onUpdateExpandedKeys: [Function, Array] as PropType<MaybeArray<OnUpdateKeys>>,
  onUpdateValue: [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
  'onUpdate:value': [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
  expandIcon: Function as PropType<(option: MenuOption) => VNodeChild>,
  renderIcon: Function as PropType<(option: MenuOption) => VNodeChild>,
  renderLabel: Function as PropType<
  (option: MenuOption | MenuGroupOption) => VNodeChild
  >,
  renderExtra: Function as PropType<
  (option: MenuOption | MenuGroupOption) => VNodeChild
  >,
  /** TODO: deprecate it */
  dropdownPlacement: {
    type: String as PropType<FollowerPlacement>,
    default: 'bottom'
  },
  dropdownProps: Object as PropType<DropdownProps>,
  accordion: Boolean,
  // deprecated
  items: Array as PropType<Array<MenuOption | MenuGroupOption>>,
  onOpenNamesChange: [Function, Array] as PropType<MaybeArray<OnUpdateKeys>>,
  onSelect: [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
  onExpandedNamesChange: [Function, Array] as PropType<
  MaybeArray<OnUpdateKeys>
  >,
  expandedNames: Array as PropType<Key[]>,
  defaultExpandedNames: Array as PropType<Key[]>
} as const

export type MenuSetupProps = ExtractPropTypes<typeof menuProps>

export type MenuProps = Partial<MenuSetupProps>

export default defineComponent({
  name: 'Menu',
  props: menuProps,
  setup (props) {
    if (__DEV__) {
      useCheckDeprecated(props)
    }
    const { mergedClsPrefixRef, inlineThemeDisabled } = useConfig(props)
    const themeRef = useTheme(
      'Menu',
      '-menu',
      style,
      menuLight,
      props,
      mergedClsPrefixRef
    )

    const layoutSider = inject(layoutSiderInjectionKey, null)

    const mergedCollapsedRef = computed(() => {
      const { collapsed } = props
      if (collapsed !== undefined) return collapsed
      if (layoutSider) {
        const { collapseModeRef, collapsedRef } = layoutSider
        if (collapseModeRef.value === 'width') {
          return collapsedRef.value ?? false
        }
      }
      return false
    })

    // TODO treeMate
    // treeMate本身是无状态，不缓存任何组件状态的
    const treeMateRef = computed(() => {
      const { keyField, childrenField } = props
      return createTreeMate<MenuOption, MenuGroupOption, MenuIgnoredOption>(
        props.items || props.options,
        {
          getChildren (node) {
            return node[childrenField]
          },
          getKey (node) {
            return (node[keyField] as Key) ?? node.name
          }
        }
      )
    })
    // console.log('treeMateRef', treeMateRef.value)

    const treeKeysLevelOneRef = computed(
      () => new Set(treeMateRef.value.treeNodes.map((e) => e.key))
    )

    // console.log('treeKeysLevelOneRef', treeKeysLevelOneRef.value)

    const { watchProps } = props

    const uncontrolledValueRef = ref<Key | null>(null)
    if (watchProps?.includes('defaultValue')) {
      watchEffect(() => {
        // 需要检测变更的默认属性，检测后组件状态会更新
        // 也就是说默认属性发生变化 组件更新 --- 按以前 改变默认属性 不会引起组件更新吗 也就是只会用一次？
        // get的时候才会被收集依赖 明白了 这里只会收集props.defaultValue依赖
        uncontrolledValueRef.value = props.defaultValue
      })
    } else {
      uncontrolledValueRef.value = props.defaultValue
    }
    const controlledValueRef = toRef(props, 'value')
    // 当前选中的菜单item
    // 合并受控和非受控
    // TODO mergeXXX是处理含有非受控属性的
    const mergedValueRef = useMergedState(
      controlledValueRef,
      uncontrolledValueRef
    )
    const uncontrolledExpandedKeysRef = ref<Key[]>([])
    const initUncontrolledExpandedKeys = (): void => {
      console.log('getPath', treeMateRef.value.getPath('food', {
        includeSelf: true
      }).keyPath)
      console.log('treeMateRef.value.getNonLeafKeys()-->', treeMateRef.value.getNonLeafKeys())
      // console.log('mergedValueRef.value---', mergedValueRef.value)
      // defaultExpandAll默认是否全部展开
      uncontrolledExpandedKeysRef.value = props.defaultExpandAll
        // getNonLeafKeys获取非叶子节点的key值
        ? treeMateRef.value.getNonLeafKeys()
        // defaultExpandedNames和defaultExpandedKeys是等价的
        // `expanded-names` is deprecated, please use `expanded-keys` instead.'
        : props.defaultExpandedNames ||
        props.defaultExpandedKeys ||
        // includeSelf是否包括自己
        // 选中的值不可能是sub菜单，而是子项options,因为mergedValueRef对于选中的子项，所以才不包括当前子项
          treeMateRef.value.getPath(mergedValueRef.value, {
            includeSelf: false
          }).keyPath
    }
    if (watchProps?.includes('defaultExpandedKeys')) {
      watchEffect(initUncontrolledExpandedKeys)
    } else {
      initUncontrolledExpandedKeys()
    }
    // 兼容
    const controlledExpandedKeysRef = useCompitable(props, [
      'expandedNames',
      'expandedKeys'
    ])
    // console.log('controlledExpandedKeysRef---', controlledExpandedKeysRef.value)
    const mergedExpandedKeysRef = useMergedState(
      controlledExpandedKeysRef,
      uncontrolledExpandedKeysRef
    )
    const tmNodesRef = computed(() => treeMateRef.value.treeNodes)
    // console.log('tmNodesRef', tmNodesRef.value)
    // 获取当前选中的路径
    const activePathRef = computed(() => {
      return treeMateRef.value.getPath(mergedValueRef.value).keyPath
    })
    // 提供这些数据给子组件
    provide(menuInjectionKey, {
      props,
      mergedCollapsedRef,
      mergedThemeRef: themeRef,
      mergedValueRef,
      mergedExpandedKeysRef,
      activePathRef,
      mergedClsPrefixRef,
      isHorizontalRef: computed(() => props.mode === 'horizontal'),
      invertedRef: toRef(props, 'inverted'),
      doSelect,
      toggleExpand
    })
    function doSelect (value: Key, item: MenuOption): void {
      const {
        'onUpdate:value': _onUpdateValue,
        onUpdateValue,
        onSelect
      } = props
      if (onUpdateValue) {
        call(onUpdateValue as OnUpdateValueImpl, value, item)
      }
      if (_onUpdateValue) {
        call(_onUpdateValue as OnUpdateValueImpl, value, item)
      }
      if (onSelect) {
        call(onSelect as OnUpdateValueImpl, value, item)
      }
      uncontrolledValueRef.value = value
    }
    // 组件通信回调
    function doUpdateExpandedKeys (value: Key[]): void {
      const {
        'onUpdate:expandedKeys': _onUpdateExpandedKeys,
        onUpdateExpandedKeys,
        onExpandedNamesChange,
        onOpenNamesChange
      } = props
      if (_onUpdateExpandedKeys) {
        call(_onUpdateExpandedKeys as OnUpdateKeysImpl, value)
      }
      if (onUpdateExpandedKeys) {
        call(onUpdateExpandedKeys as OnUpdateKeysImpl, value)
      }
      // deprecated
      if (onExpandedNamesChange) {
        call(onExpandedNamesChange as OnUpdateKeysImpl, value)
      }
      if (onOpenNamesChange) {
        call(onOpenNamesChange as OnUpdateKeysImpl, value)
      }
      uncontrolledExpandedKeysRef.value = value
    }
    // expand展开开关
    function toggleExpand (key: Key): void {
      const currentExpandedKeys = Array.from(mergedExpandedKeysRef.value)
      const index = currentExpandedKeys.findIndex(
        (expanededKey) => expanededKey === key
      )
      if (~index) {
        // 如果存在则删除 就是收起expand菜单
        currentExpandedKeys.splice(index, 1)
      } else {
        if (props.accordion) {
          if (treeKeysLevelOneRef.value.has(key)) {
            const closeKeyIndex = currentExpandedKeys.findIndex((e) =>
              treeKeysLevelOneRef.value.has(e)
            )
            if (closeKeyIndex > -1) {
              currentExpandedKeys.splice(closeKeyIndex, 1)
            }
          }
        }
        currentExpandedKeys.push(key)
      }
      doUpdateExpandedKeys(currentExpandedKeys)
    }
    const cssVarsRef = computed(() => {
      const { inverted } = props
      const {
        common: { cubicBezierEaseInOut },
        self
      } = themeRef.value
      const {
        borderRadius,
        borderColorHorizontal,
        fontSize,
        itemHeight,
        dividerColor
      } = self
      const vars: any = {
        '--n-divider-color': dividerColor,
        '--n-bezier': cubicBezierEaseInOut,
        '--n-font-size': fontSize,
        '--n-border-color-horizontal': borderColorHorizontal,
        '--n-border-radius': borderRadius,
        '--n-item-height': itemHeight
      }
      if (inverted) {
        vars['--n-group-text-color'] = self.groupTextColorInverted
        vars['--n-color'] = self.colorInverted
        vars['--n-item-text-color'] = self.itemTextColorInverted
        vars['--n-arrow-color'] = self.arrowColorInverted
        vars['--n-arrow-color-hover'] = self.arrowColorHoverInverted
        vars['--n-arrow-color-active'] = self.arrowColorActiveInverted
        vars['--n-arrow-color-child-active'] =
          self.arrowColorChildActiveInverted
        vars['--n-item-icon-color'] = self.itemIconColorInverted
        vars['--n-item-text-color-hover'] = self.itemTextColorHoverInverted
        vars['--n-item-icon-color-hover'] = self.itemIconColorHoverInverted
        vars['--n-item-text-color-active'] = self.itemTextColorActiveInverted
        vars['--n-item-icon-color-active'] = self.itemIconColorActiveInverted
        vars['--n-item-icon-color-collapsed'] =
          self.itemIconColorCollapsedInverted
        vars['--n-item-color-active'] = self.itemColorActiveInverted
        vars['--n-item-color-active-collapsed'] =
          self.itemColorActiveCollapsedInverted
        vars['--n-item-text-color-child-active'] =
          self.itemTextColorChildActiveInverted
        vars['--n-item-icon-color-child-active'] =
          self.itemIconColorChildActiveInverted
      } else {
        vars['--n-group-text-color'] = self.groupTextColor
        vars['--n-color'] = self.color
        vars['--n-item-text-color'] = self.itemTextColor
        vars['--n-arrow-color'] = self.arrowColor
        vars['--n-arrow-color-hover'] = self.arrowColorHover
        vars['--n-arrow-color-active'] = self.arrowColorActive
        vars['--n-arrow-color-child-active'] = self.arrowColorChildActive
        vars['--n-item-icon-color'] = self.itemIconColor
        vars['--n-item-text-color-hover'] = self.itemTextColorHover
        vars['--n-item-icon-color-hover'] = self.itemIconColorHover
        vars['--n-item-text-color-active'] = self.itemTextColorActive
        vars['--n-item-icon-color-active'] = self.itemIconColorActive
        vars['--n-item-icon-color-collapsed'] = self.itemIconColorCollapsed
        vars['--n-item-color-active'] = self.itemColorActive
        vars['--n-item-color-active-collapsed'] = self.itemColorActiveCollapsed
        vars['--n-item-text-color-child-active'] = self.itemTextColorChildActive
        vars['--n-item-icon-color-child-active'] = self.itemIconColorChildActive
      }
      return vars
    })
    const themeClassHandle = inlineThemeDisabled
      ? useThemeClass(
        'menu',
        computed(() => (props.inverted ? 'a' : 'b')),
        cssVarsRef,
        props
      )
      : undefined
    return {
      mergedClsPrefix: mergedClsPrefixRef,
      controlledExpandedKeys: controlledExpandedKeysRef,
      uncontrolledExpanededKeys: uncontrolledExpandedKeysRef,
      mergedExpandedKeys: mergedExpandedKeysRef,
      uncontrolledValue: uncontrolledValueRef,
      mergedValue: mergedValueRef,
      activePath: activePathRef,
      tmNodes: tmNodesRef,
      mergedTheme: themeRef,
      mergedCollapsed: mergedCollapsedRef,
      cssVars: inlineThemeDisabled ? undefined : cssVarsRef,
      themeClass: themeClassHandle?.themeClass,
      onRender: themeClassHandle?.onRender
    }
  },
  render () {
    const { mergedClsPrefix, mode, themeClass, onRender } = this
    onRender?.()
    return (
      <div
        role={mode === 'horizontal' ? 'menubar' : 'menu'}
        class={[
          `${mergedClsPrefix}-menu`,
          themeClass,
          `${mergedClsPrefix}-menu--${mode}`,
          this.mergedCollapsed && `${mergedClsPrefix}-menu--collapsed`
        ]}
        style={this.cssVars as any}
      >
        {this.tmNodes.map((tmNode) => itemRenderer(tmNode, this.$props))}
      </div>
    )
  }
})
