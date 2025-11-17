/**
 * Property Fields
 *
 * Fields related to property information.
 */

import type { UnifiedFieldMetadata } from '../../unified-field-metadata'

export const propertyFields: Record<string, UnifiedFieldMetadata> = {
  ownsHome: {
    shortcut: 'o',
    label: 'Owns Home',
    question: 'Does the client own a home?',
    description: 'Home ownership status',
    category: 'Property',
    fieldType: 'boolean',
    flows: ['intake', 'policy'],
    singleInstance: true,
  },

  propertyType: {
    shortcut: 't',
    label: 'Property Type',
    question: 'What is the property type?',
    description: 'Property type',
    category: 'Property',
    fieldType: 'string',
    aliases: ['property', 'propertytype', 'prop'],
    flows: ['intake', 'policy'],
    singleInstance: true,
    options: ['single-family', 'condo', 'townhouse', 'mobile-home', 'duplex', 'apartment'],
  },

  yearBuilt: {
    shortcut: '',
    label: 'Year Built',
    question: 'What year was the property built?',
    description: 'Year property was built',
    category: 'Property',
    fieldType: 'numeric',
    flows: ['intake', 'policy'],
    min: 1800,
    max: 2100,
    singleInstance: true,
  },

  roofType: {
    shortcut: '',
    label: 'Roof Type',
    question: 'What is the roof type?',
    description: 'Roof type',
    category: 'Property',
    fieldType: 'string',
    flows: ['intake', 'policy'],
    singleInstance: true,
    options: ['asphalt', 'metal', 'tile', 'shingle', 'flat', 'slate', 'wood', 'rubber'],
  },

  squareFeet: {
    shortcut: '',
    label: 'Square Feet',
    question: 'What is the square footage?',
    description: 'Square footage',
    category: 'Property',
    fieldType: 'numeric',
    flows: ['intake', 'policy'],
    min: 0,
    singleInstance: true,
  },
}
