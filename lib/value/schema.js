'use strict';

var Immutable = require('immutable');
var {is, fromJS, Map} = Immutable;
var invariant = require('../invariant');
var messages = require('../messages');

/**
 * Node represent schema for data.
 *
 * Hierarchy is the following:
 *
 *                       ScalarNode
 *                      /
 *   Node - ConcreteNode               MappingNode
 *                      \             /
 *                       CompositeNode
 *                                    \
 *                                     ListNode
 */
class Node {

  constructor(props) {
    this.props = props;
  }

  equals(node) {
    if (
      node === null || node === undefined ||
      node.constructor !== undefined &&
      node.constructor !== this.constructor
    ) {
      return false;
    }
    return is(this.props, node.props) && is(this.children, node.children);
  }

  get defaultValue() {
    if (this.__defaultValue === undefined) {
      this.__defaultValue = fromJS(this.props.get('defaultValue'));
    }
    return this.__defaultValue;
  }

  instantiate(value) {
    throw new Error('not implemented');
  }

  toString() {
    var props = this.props.map((v, k) => `${k}: ${v}`).toList().join(', ');
    return `${this.constructor.name} { ${props} }`;
  }

  static create(props) {
    props = Map(props || {});
    return new this(props);
  }
}

class ConcreteNode extends Node {

  instantiate(value) {
    return this;
  }
}

class CompositeNode extends ConcreteNode {

  get children() {
    if (this.__children === undefined) {
      this.__children = this.getChildren();
    }
    return this.__children;
  }

  getChildren() {
    throw new Error('getChildren(): not implemented');
  }

  get(key) {
    throw new Error('get(key): not implemented');
  }

  has(key) {
    throw new Error('has(key): not implemented');
  }

  keys(value) {
    throw new Error('keys(value): not implemented');
  }
}

class ScalarNode extends ConcreteNode {

  serialize(value) {
    return value === null ? '' : value;
  }

  deserialize(value) {
    return value === '' ? null : value;
  }
}

class NumberNode extends ScalarNode {

  deserialize(value) {
    if (value === '') {
      return null;
    // based on http://stackoverflow.com/a/1830844/182954
    } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
      return parseFloat(value);
    } else {
      return new Error(messages.INVALID_VALUE);
    }
  }
}

function Scalar(props) {
  switch (props && props.type || 'string') {
    case 'string':
      return ScalarNode.create(props);
    case 'number':
      return NumberNode.create(props);
    default:
      invariant(
        false,
        `invalid type "${props.type}" supplied to Scalar`
      );
  }
}

class MappingNode extends CompositeNode {

  getChildren() {
    return this.props.get('children');
  }

  get(key) {
    return this.children.get(key);
  }

  has(key) {
    return this.children.has(key);
  }

  keys(value) {
    return this.children.keys();
  }

  static create(props, children) {
    if (children === undefined) {
      children = props;
      children = Map(children);
      props = {children};
    } else {
      children = Map(children);
      var newProps = {children};
      for (var k in props) {
        if (props.hasOwnProperty(k)) {
          newProps[k] = props[k];
        }
      }
      props = newProps;
    }
    props = Map(props);
    return new this(props);
  }
}

var Mapping = MappingNode.create.bind(MappingNode);

class ListNode extends CompositeNode {

  getChildren() {
    return this.props.get('children');
  }

  get(key) {
    return this.children;
  }

  has(key) {
    return true;
  }

  keys(value) {
    return value.keys();
  }

  static create(props, children) {
    if (children === undefined) {
      children = props;
      props = {children};
    } else {
      var newProps = {};
      for (var k in props) {
        if (props.hasOwnProperty(k)) {
          newProps[k] = props[k];
        }
        newProps.children = children;
      }
      props = newProps;
    }
    props = Map(props);
    return new ListNode(props);
  }
}

var List = ListNode.create.bind(List);

module.exports = {
  Node, CompositeNode,
  ScalarNode, MappingNode, ListNode,
  Scalar, Mapping, List
};