import { JSONSchemaType } from 'ajv';

import { H5P } from './validation/h5p';

export const h5pImport = {
  querystring: {
    type: 'object',
    properties: {
      parentId: { $ref: 'http://graasp.org/#/definitions/uuid' },
    },
    additionalProperties: false,
  },
};

export const h5pServe = {
  params: {
    itemId: {
      $ref: 'http://graasp.org/#/definitions/uuid',
    },
    // content path (rest of route)
    '*': {
      type: 'string',
    },
  },
  required: ['itemId', '*'],
  additionalProperties: false,
};

export const h5pDownload = {
  params: {
    itemId: {
      $ref: 'http://graasp.org/#/definitions/uuid',
    },
  },
  required: ['itemId'],
  additionalProperties: false,
};

/**
 * Describes an h5p.json manifest as a JSON schema
 * See {@link H5P.Manifest}
 */
export const h5pManifestSchema: JSONSchemaType<H5P.Manifest> = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    mainLibrary: { type: 'string' },
    language: {
      type: 'string',
      enum: [
        'aa',
        'ab',
        'ae',
        'af',
        'ak',
        'am',
        'an',
        'ar',
        'as',
        'av',
        'ay',
        'az',
        'ba',
        'be',
        'bg',
        'bh',
        'bi',
        'bm',
        'bn',
        'bo',
        'br',
        'bs',
        'ca',
        'ce',
        'ch',
        'co',
        'cr',
        'cs',
        'cu',
        'cv',
        'cy',
        'da',
        'de',
        'dv',
        'dz',
        'ee',
        'el',
        'en',
        'eo',
        'es',
        'et',
        'eu',
        'fa',
        'ff',
        'fi',
        'fj',
        'fo',
        'fr',
        'fy',
        'ga',
        'gd',
        'gl',
        'gn',
        'gu',
        'gv',
        'ha',
        'he',
        'hi',
        'ho',
        'hr',
        'ht',
        'hu',
        'hy',
        'hz',
        'ia',
        'id',
        'ie',
        'ig',
        'ii',
        'ik',
        'io',
        'is',
        'it',
        'iu',
        'ja',
        'jv',
        'ka',
        'kg',
        'ki',
        'kj',
        'kk',
        'kl',
        'km',
        'kn',
        'ko',
        'kr',
        'ks',
        'ku',
        'kv',
        'kw',
        'ky',
        'la',
        'lb',
        'lg',
        'li',
        'ln',
        'lo',
        'lt',
        'lu',
        'lv',
        'mg',
        'mh',
        'mi',
        'mk',
        'ml',
        'mn',
        'mr',
        'ms',
        'mt',
        'my',
        'na',
        'nb',
        'nd',
        'ne',
        'ng',
        'nl',
        'nn',
        'no',
        'nr',
        'nv',
        'ny',
        'oc',
        'oj',
        'om',
        'or',
        'os',
        'pa',
        'pi',
        'pl',
        'ps',
        'pt',
        'qu',
        'rm',
        'rn',
        'ro',
        'ru',
        'rw',
        'sa',
        'sc',
        'sd',
        'se',
        'sg',
        'si',
        'sk',
        'sl',
        'sm',
        'sn',
        'so',
        'sq',
        'sr',
        'ss',
        'st',
        'su',
        'sv',
        'sw',
        'ta',
        'te',
        'tg',
        'th',
        'ti',
        'tk',
        'tl',
        'tn',
        'to',
        'tr',
        'ts',
        'tt',
        'tw',
        'ty',
        'ug',
        'uk',
        'ur',
        'uz',
        've',
        'vi',
        'vo',
        'wa',
        'wo',
        'xh',
        'yi',
        'yo',
        'za',
        'zh',
        'zu',
        'und',
      ],
    },
    preloadedDependencies: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          machineName: { type: 'string' },
          majorVersion: { type: ['integer', 'string'] },
          minorVersion: { type: ['integer', 'string'] },
        },
        required: ['machineName', 'majorVersion', 'minorVersion'],
      },
    },
    embedTypes: {
      type: 'array',
      minItems: 1,
      maxItems: 2,
      items: { type: 'string', enum: ['div', 'iframe'] },
      uniqueItems: true,
    },
    authors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string', enum: ['Author', 'Editor', 'Licensee', 'Originator'] },
        },
        required: ['name', 'role'],
      },
      nullable: true, // JSON schema treats undefined as nullable?
    },
    source: {
      type: 'string',
      nullable: true, // JSON schema treats undefined as nullable?
    },
    license: {
      type: 'string',
      enum: [
        'CC-BY',
        'CC BY-SA',
        'CC BY-ND',
        'CC BY-NC',
        'CC BY-NC-SA',
        'CC CC-BY-NC-CD',
        'CC0 1.0',
        'GNU GPL',
        'PD',
        'ODC PDDL',
        'CC PDM',
        'C',
        'U',
      ],
      nullable: true, // JSON schema treats undefined as nullable?
    },
    licenseVersion: {
      type: 'string',
      nullable: true, // JSON schema treats undefined as nullable?
    },
    licenseExtras: {
      type: 'string',
      nullable: true, // JSON schema treats undefined as nullable?
    },
    yearFrom: {
      type: 'string',
      nullable: true, // JSON schema treats undefined as nullable?
    },
    yearTo: {
      type: 'string',
      nullable: true, // JSON schema treats undefined as nullable?
    },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          author: { type: 'string' },
          log: { type: 'string' },
        },
        required: ['date', 'author', 'log'],
      },
      nullable: true, // JSON schema treats undefined as nullable?
    },
    authorComments: {
      type: 'string',
      nullable: true, // JSON schema treats undefined as nullable?
    },
  },
  /*
    // the spec theoretically defines allowed license versions. Uncomment to enable this check
  allOf: [
    {
      if: {
        properties: {
          license: {
              type: 'string',
            enum: ['CC-BY', 'CC BY-SA', 'CC BY-ND', 'CC BY-NC', 'CC BY-NC-SA', 'CC CC-BY-NC-CD'],
          },
        },
      },
      then: {
        properties: { licenseVersion: { enum: ['1.0', '2.0', '2.5', '3.0', '4.0'] } },
      },
    },
    {
      if: {
        properties: {
          license: {
            const: 'GNU GPL',
          },
        },
      },
      then: {
        properties: { licenseVersion: { enum: ['v1', 'v2', 'v3'] } },
      },
    },
    {
      if: {
        properties: {
          license: {
            const: 'PD',
          },
        },
      },
      then: {
        properties: { licenseVersion: { enum: ['-', 'CCO 1.0', 'CC PDM'] } },
      },
    },
  ],
  */
  required: ['title', 'mainLibrary', 'language', 'preloadedDependencies', 'embedTypes'],
  additionalProperties: true,
};
