// @flow
import hyphenate from 'fbjs/lib/hyphenateStyleName'
import React from 'react'
import isPlainObject from './isPlainObject'
import StyledError from './error'
import type { Interpolation } from '../types'

export const objToCss = (obj: Object, prevKey?: string): string => {
  const css = Object.keys(obj)
    .filter(key => {
      const chunk = obj[key]
      return (
        chunk !== undefined && chunk !== null && chunk !== false && chunk !== ''
      )
    })
    .map(key => {
      if (isPlainObject(obj[key])) return objToCss(obj[key], key)
      return `${hyphenate(key)}: ${obj[key]};`
    })
    .join(' ')
  return prevKey
    ? `${prevKey} {
  ${css}
}`
    : css
}

const flatten = (
  chunks: Array<Interpolation>,
  executionContext: ?Object
): Array<Interpolation> =>
  chunks.reduce((ruleSet: Array<Interpolation>, chunk: ?Interpolation) => {
    /* Remove falsey values */
    if (
      chunk === undefined ||
      chunk === null ||
      chunk === false ||
      chunk === ''
    ) {
      return ruleSet
    }

    /* Flatten ruleSet */
    if (Array.isArray(chunk)) {
      ruleSet.push(...flatten(chunk, executionContext))
      return ruleSet
    }

    /* Handle other components */
    if (chunk.hasOwnProperty('styledComponentId')) {
      // $FlowFixMe not sure how to make this pass
      ruleSet.push(`.${chunk.styledComponentId}`)
      return ruleSet
    }

    /* Throw if a React Element was given styles */
    if (React.isValidElement(chunk)) {
      const elementName =
        /* $FlowFixMe TODO: flow for chunk of type React Element. Not sure if Element should be added to Interpolation */
        typeof chunk.type === 'string'
          ? chunk.type
          : chunk.type.displayName || chunk.type.name
      throw new StyledError(
        1,
        `A plain React class (${elementName}) 
        was interpolated in your styles, probably as a component selector (https://www.styled-components.com/docs/advanced#referring-to-other-components). Only styled-component classes can be targeted in this fashion.`
      )
    }

    /* Either execute or defer the function */
    if (typeof chunk === 'function') {
      if (executionContext) {
        ruleSet.push(...flatten([chunk(executionContext)], executionContext))
      } else ruleSet.push(chunk)

      return ruleSet
    }

    /* Handle objects */
    ruleSet.push(
      // $FlowFixMe have to add %checks somehow to isPlainObject
      isPlainObject(chunk) ? objToCss(chunk) : chunk.toString()
    )

    return ruleSet
  }, [])

export default flatten
