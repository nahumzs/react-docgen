/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { statement as stmt } from '../../../tests/utils';
import getTSType from '../getTSType';

function statement(code) {
  return stmt(code, {
    filename: 'test.ts',
    babelrc: false,
  });
}

describe('getTSType', () => {
  it('detects simple types', () => {
    const simplePropTypes = [
      'string',
      'number',
      'boolean',
      'symbol',
      'object',
      'any',
      'unknown',
      'null',
      'undefined',
      'void',
      'Object',
      'Function',
      'Boolean',
      'String',
      'Number',
    ];

    simplePropTypes.forEach(type => {
      const typePath = statement(`let x: ${type};`)
        .get('declarations', 0)
        .get('id')
        .get('typeAnnotation')
        .get('typeAnnotation');
      expect(getTSType(typePath)).toEqual({ name: type });
    });
  });

  it('detects literal types', () => {
    const literalTypes = ['"foo"', 1234, true];

    literalTypes.forEach(value => {
      const typePath = statement(`let x: ${value};`)
        .get('declarations', 0)
        .get('id')
        .get('typeAnnotation')
        .get('typeAnnotation');
      expect(getTSType(typePath)).toEqual({
        name: 'literal',
        value: `${value}`,
      });
    });
  });

  it('detects external type', () => {
    const typePath = statement('let x: xyz;')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({ name: 'xyz' });
  });

  it('detects array type shorthand', () => {
    const typePath = statement('let x: number[];')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'Array',
      elements: [{ name: 'number' }],
      raw: 'number[]',
    });
  });

  it('detects array type', () => {
    const typePath = statement('let x: Array<number>;')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'Array',
      elements: [{ name: 'number' }],
      raw: 'Array<number>',
    });
  });

  it('detects array type with multiple types', () => {
    const typePath = statement('let x: Array<number, xyz>;')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'Array',
      elements: [{ name: 'number' }, { name: 'xyz' }],
      raw: 'Array<number, xyz>',
    });
  });

  it('detects class type', () => {
    const typePath = statement('let x: Class<Boolean>;')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'Class',
      elements: [{ name: 'Boolean' }],
      raw: 'Class<Boolean>',
    });
  });

  it('detects function type with subtype', () => {
    const typePath = statement('let x: Function<xyz>;')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'Function',
      elements: [{ name: 'xyz' }],
      raw: 'Function<xyz>',
    });
  });

  it('detects object types', () => {
    const typePath = statement('let x: { a: string, b?: xyz };')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'object',
      signature: {
        properties: [
          { key: 'a', value: { name: 'string', required: true } },
          { key: 'b', value: { name: 'xyz', required: false } },
        ],
      },
      raw: '{ a: string, b?: xyz }',
    });
  });

  it('detects union type', () => {
    const typePath = statement('let x: string | xyz | "foo" | void;')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'union',
      elements: [
        { name: 'string' },
        { name: 'xyz' },
        { name: 'literal', value: '"foo"' },
        { name: 'void' },
      ],
      raw: 'string | xyz | "foo" | void',
    });
  });

  it('detects intersection type', () => {
    const typePath = statement('let x: string & xyz & "foo" & void;')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'intersection',
      elements: [
        { name: 'string' },
        { name: 'xyz' },
        { name: 'literal', value: '"foo"' },
        { name: 'void' },
      ],
      raw: 'string & xyz & "foo" & void',
    });
  });

  it('detects function signature type', () => {
    const typePath = statement(
      'let x: (p1: number, p2: string, ...rest: Array<string>) => boolean;',
    )
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'function',
      signature: {
        arguments: [
          { name: 'p1', type: { name: 'number' } },
          { name: 'p2', type: { name: 'string' } },
          {
            name: 'rest',
            rest: true,
            type: {
              name: 'Array',
              elements: [{ name: 'string' }],
              raw: 'Array<string>',
            },
          },
        ],
        return: { name: 'boolean' },
      },
      raw: '(p1: number, p2: string, ...rest: Array<string>) => boolean',
    });
  });

  it('detects function signature type with `this` parameter', () => {
    const typePath = statement('let x: (this: Foo, p1: number) => boolean;')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'function',
      signature: {
        arguments: [{ name: 'p1', type: { name: 'number' } }],
        this: { name: 'Foo' },
        return: { name: 'boolean' },
      },
      raw: '(this: Foo, p1: number) => boolean',
    });
  });

  it('detects callable signature type', () => {
    const typePath = statement(
      'let x: { (str: string): string, token: string };',
    )
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'object',
      signature: {
        constructor: {
          name: 'signature',
          type: 'function',
          signature: {
            arguments: [{ name: 'str', type: { name: 'string' } }],
            return: { name: 'string' },
          },
          raw: '(str: string): string,', // TODO: why does it print a comma?
        },
        properties: [
          { key: 'token', value: { name: 'string', required: true } },
        ],
      },
      raw: '{ (str: string): string, token: string }',
    });
  });

  it('detects map signature', () => {
    const typePath = statement(
      'let x: { [key: string]: number, [key: "xl"]: string, token: "a" | "b" };',
    )
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'object',
      signature: {
        properties: [
          {
            key: { name: 'string' },
            value: { name: 'number', required: true },
          },
          {
            key: { name: 'literal', value: '"xl"' },
            value: { name: 'string', required: true },
          },
          {
            key: 'token',
            value: {
              name: 'union',
              required: true,
              raw: '"a" | "b"',
              elements: [
                { name: 'literal', value: '"a"' },
                { name: 'literal', value: '"b"' },
              ],
            },
          },
        ],
      },
      raw: '{ [key: string]: number, [key: "xl"]: string, token: "a" | "b" }',
    });
  });

  it('detects tuple signature', () => {
    const typePath = statement('let x: [string, number];')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'tuple',
      elements: [{ name: 'string' }, { name: 'number' }],
      raw: '[string, number]',
    });
  });

  it('detects tuple in union signature', () => {
    const typePath = statement('let x: [string, number] | [number, string];')
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'union',
      elements: [
        {
          name: 'tuple',
          elements: [{ name: 'string' }, { name: 'number' }],
          raw: '[string, number]',
        },
        {
          name: 'tuple',
          elements: [{ name: 'number' }, { name: 'string' }],
          raw: '[number, string]',
        },
      ],
      raw: '[string, number] | [number, string]',
    });
  });

  it('detects indexed access', () => {
    const typePath = statement(`
      var x: A["x"] = 2;

      interface A { x: string };
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'A["x"]',
      raw: 'A["x"]',
    });
  });

  it('resolves indexed access', () => {
    const typePath = statement(`
      var x: A["x"] = 2;

      type A = { x: string };
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');
    expect(getTSType(typePath)).toEqual({
      name: 'string',
      raw: 'A["x"]',
    });
  });

  it('resolves types in scope', () => {
    const typePath = statement(`
      var x: MyType = 2;

      type MyType = string;
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({ name: 'string' });
  });

  it('handles typeof types', () => {
    const typePath = statement(`
      var x: typeof MyType = {};

      type MyType = { a: string, b: xyz };
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'object',
      signature: {
        properties: [
          { key: 'a', value: { name: 'string', required: true } },
          { key: 'b', value: { name: 'xyz', required: true } },
        ],
      },
      raw: '{ a: string, b: xyz }',
    });
  });

  it('handles qualified type identifiers', () => {
    const typePath = statement(`
      var x: MyType.x = {};

      type MyType = { a: string, b: xyz };
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'MyType.x',
    });
  });

  it('handles qualified type identifiers with params', () => {
    const typePath = statement(`
      var x: MyType.x<any> = {};

      type MyType = { a: string, b: xyz };
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'MyType.x',
      raw: 'MyType.x<any>',
      elements: [
        {
          name: 'any',
        },
      ],
    });
  });

  it('handles generic types', () => {
    const typePath = statement(`
      var x: MyType<string> = {};

      type MyType<T> = { a: T, b: Array<T> };
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'object',
      raw: '{ a: T, b: Array<T> }',
      signature: {
        properties: [
          {
            key: 'a',
            value: {
              name: 'string',
              required: true,
            },
          },
          {
            key: 'b',
            value: {
              name: 'Array',
              raw: 'Array<T>',
              required: true,
              elements: [{ name: 'string' }],
            },
          },
        ],
      },
    });
  });

  it('handles mapped types', () => {
    const typePath = statement(`
      var x: { [key in 'x' | 'y']: boolean};
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'object',
      raw: "{ [key in 'x' | 'y']: boolean}",
      signature: {
        properties: [
          {
            key: {
              elements: [
                {
                  name: 'literal',
                  value: "'x'",
                },
                {
                  name: 'literal',
                  value: "'y'",
                },
              ],
              name: 'union',
              raw: "'x' | 'y'",
              required: true,
            },
            value: {
              name: 'boolean',
            },
          },
        ],
      },
    });
  });

  describe('React types', () => {
    function test(type, expected) {
      const typePath = statement(`
        var x: ${type} = 2;

        type Props = { x: string };
      `)
        .get('declarations', 0)
        .get('id')
        .get('typeAnnotation')
        .get('typeAnnotation');

      expect(getTSType(typePath)).toEqual({
        ...expected,
        name: type.replace('.', '').replace(/<.+>/, ''),
        raw: type,
      });
    }

    const types = {
      'React.Node': {},
      'React.Key': {},
      'React.ElementType': {},
      'React.ChildrenArray<string>': { elements: [{ name: 'string' }] },
      'React.Element<any>': { elements: [{ name: 'any' }] },
      'React.Ref<typeof Component>': { elements: [{ name: 'Component' }] },
      'React.ElementProps<Component>': { elements: [{ name: 'Component' }] },
      'React.ElementRef<Component>': { elements: [{ name: 'Component' }] },
      'React.ComponentType<Props>': {
        elements: [
          {
            name: 'signature',
            raw: '{ x: string }',
            signature: {
              properties: [
                { key: 'x', value: { name: 'string', required: true } },
              ],
            },
            type: 'object',
          },
        ],
      },
      'React.StatelessFunctionalComponent<Props2>': {
        elements: [{ name: 'Props2' }],
      },
    };

    Object.keys(types).forEach(type => {
      it(type, () => test(type, types[type]));
    });
  });

  it('resolves keyof to union', () => {
    const typePath = statement(`
      var x: keyof typeof CONTENTS = 2;
      const CONTENTS = {
        'apple': '🍎',
        'banana': '🍌',
      };
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'union',
      elements: [
        { name: 'literal', value: "'apple'" },
        { name: 'literal', value: "'banana'" },
      ],
      raw: 'keyof typeof CONTENTS',
    });
  });

  it('resolves keyof with inline object to union', () => {
    const typePath = statement(`
      var x: keyof { apple: string, banana: string } = 2;
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'union',
      elements: [
        { name: 'literal', value: 'apple' },
        { name: 'literal', value: 'banana' },
      ],
      raw: 'keyof { apple: string, banana: string }',
    });
  });

  it('handles multiple references to one type', () => {
    const typePath = statement(`
      let action: { a: Action, b: Action };
      type Action = {};
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'object',
      signature: {
        properties: [
          {
            key: 'a',
            value: {
              name: 'signature',
              type: 'object',
              required: true,
              raw: '{}',
              signature: { properties: [] },
            },
          },
          {
            key: 'b',
            value: {
              name: 'signature',
              type: 'object',
              required: true,
              raw: '{}',
              signature: { properties: [] },
            },
          },
        ],
      },
      raw: '{ a: Action, b: Action }',
    });
  });

  it('handles generics of the same Name', () => {
    const typePath = statement(`
      interface Props {
        baz: Foo<T>
      }

      type Foo<T> = Bar<T>

    `)
      .get('body')
      .get('body', 0)
      .get('typeAnnotation');

    getTSType(typePath);
  });

  it('handles self-referencing type cycles', () => {
    const typePath = statement(`
      let action: Action;
      type Action = { subAction: Action };
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'object',
      signature: {
        properties: [
          { key: 'subAction', value: { name: 'Action', required: true } },
        ],
      },
      raw: '{ subAction: Action }',
    });
  });

  it('handles long type cycles', () => {
    const typePath = statement(`
      let action: Action;
      type Action = { subAction: SubAction };
      type SubAction = { subAction: SubSubAction };
      type SubSubAction = { subAction: SubSubSubAction };
      type SubSubSubAction = { rootAction: Action };
    `)
      .get('declarations', 0)
      .get('id')
      .get('typeAnnotation')
      .get('typeAnnotation');

    expect(getTSType(typePath)).toEqual({
      name: 'signature',
      type: 'object',
      signature: {
        properties: [
          {
            key: 'subAction',
            value: {
              name: 'signature',
              type: 'object',
              required: true,
              signature: {
                properties: [
                  {
                    key: 'subAction',
                    value: {
                      name: 'signature',
                      type: 'object',
                      required: true,
                      signature: {
                        properties: [
                          {
                            key: 'subAction',
                            value: {
                              name: 'signature',
                              type: 'object',
                              required: true,
                              signature: {
                                properties: [
                                  {
                                    key: 'rootAction',
                                    value: { name: 'Action', required: true },
                                  },
                                ],
                              },
                              raw: '{ rootAction: Action }',
                            },
                          },
                        ],
                      },
                      raw: '{ subAction: SubSubSubAction }',
                    },
                  },
                ],
              },
              raw: '{ subAction: SubSubAction }',
            },
          },
        ],
      },
      raw: '{ subAction: SubAction }',
    });
  });
});
