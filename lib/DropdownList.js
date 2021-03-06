'use strict';

var babelHelpers = require('./util/babelHelpers.js');

var React = require('react'),
    activeElement = require('react/lib/getActiveElement'),
    _ = require('./util/_'),
    contains = require('dom-helpers/query/contains'),
    cx = require('classnames'),
    compat = require('./util/compat'),
    CustomPropTypes = require('./util/propTypes'),
    Popup = require('./Popup'),
    PlainList = require('./List'),
    GroupableList = require('./ListGroupable'),
    validateList = require('./util/validateListInterface'),
    createUncontrolledWidget = require('uncontrollable');

var omit = _.omit;
var pick = _.pick;
var result = _.result;

var propTypes = {
  //-- controlled props -----------
  value: React.PropTypes.any,
  onChange: React.PropTypes.func,
  open: React.PropTypes.bool,
  onToggle: React.PropTypes.func,
  //------------------------------------

  data: React.PropTypes.array,
  valueField: React.PropTypes.string,
  textField: CustomPropTypes.accessor,

  valueComponent: CustomPropTypes.elementType,
  itemComponent: CustomPropTypes.elementType,
  listComponent: CustomPropTypes.elementType,

  groupComponent: CustomPropTypes.elementType,
  groupBy: CustomPropTypes.accessor,

  onSelect: React.PropTypes.func,

  searchTerm: React.PropTypes.string,
  onSearch: React.PropTypes.func,

  busy: React.PropTypes.bool,

  delay: React.PropTypes.number,

  dropUp: React.PropTypes.bool,
  duration: React.PropTypes.number, //popup

  disabled: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(['disabled'])]),

  readOnly: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.oneOf(['readOnly'])]),

  messages: React.PropTypes.shape({
    open: CustomPropTypes.message,
    emptyList: CustomPropTypes.message,
    emptyFilter: CustomPropTypes.message,
    filterPlaceholder: CustomPropTypes.message
  })
};

var DropdownList = React.createClass({

  displayName: 'DropdownList',

  mixins: [require('./mixins/WidgetMixin'), require('./mixins/TimeoutMixin'), require('./mixins/PureRenderMixin'), require('./mixins/DataFilterMixin'), require('./mixins/DataHelpersMixin'), require('./mixins/PopupScrollToMixin'), require('./mixins/RtlParentContextMixin'), require('./mixins/AriaDescendantMixin')()],

  propTypes: propTypes,

  getDefaultProps: function getDefaultProps() {
    return {
      delay: 500,
      value: '',
      open: false,
      data: [],
      searchTerm: '',
      messages: msgs(),
      ariaActiveDescendantKey: 'dropdownlist'
    };
  },

  getInitialState: function getInitialState() {
    var filter = this.props.open && this.props.filter,
        data = filter ? this.filter(this.props.data, this.props.searchTerm) : this.props.data,
        initialIdx = this._dataIndexOf(this.props.data, this.props.value);

    return {
      filteredData: filter && data,
      selectedItem: data[initialIdx],
      focusedItem: data[initialIdx] || data[0]
    };
  },

  componentDidUpdate: function componentDidUpdate() {
    this.refs.list && validateList(this.refs.list);
  },

  componentWillReceiveProps: function componentWillReceiveProps(props) {
    var filter = props.open && props.filter,
        data = filter ? this.filter(props.data, props.searchTerm) : props.data,
        idx = this._dataIndexOf(data, props.value);

    this.setState({
      filteredData: filter && data,
      selectedItem: data[idx],
      focusedItem: data[! ~idx ? 0 : idx]
    });
  },

  render: function render() {
    var _cx,
        _this = this;

    var _props = this.props;
    var className = _props.className;
    var tabIndex = _props.tabIndex;
    var filter = _props.filter;
    var groupBy = _props.groupBy;
    var messages = _props.messages;
    var data = _props.data;
    var busy = _props.busy;
    var dropUp = _props.dropUp;
    var placeholder = _props.placeholder;
    var value = _props.value;
    var open = _props.open;
    var disabled = _props.disabled;
    var readOnly = _props.readOnly;
    var ValueComponent = _props.valueComponent;
    var List = _props.listComponent;

    List = List || groupBy && GroupableList || PlainList;

    var elementProps = omit(this.props, Object.keys(propTypes));
    var listProps = pick(this.props, Object.keys(compat.type(List).propTypes));
    var popupProps = pick(this.props, Object.keys(compat.type(Popup).propTypes));

    var _state = this.state;
    var focusedItem = _state.focusedItem;
    var selectedItem = _state.selectedItem;
    var focused = _state.focused;

    var items = this._data(),
        valueItem = this._dataItem(data, value) // take value from the raw data
    ,
        listID = this._id('__listbox');

    var shouldRenderList = _.isFirstFocusedRender(this) || open;

    messages = msgs(messages);

    return React.createElement(
      'div',
      babelHelpers._extends({}, elementProps, {
        ref: 'input',
        role: 'combobox',
        tabIndex: tabIndex || '0',
        'aria-expanded': open,
        'aria-haspopup': true,
        'aria-owns': listID,
        'aria-busy': !!busy,
        'aria-live': !open && 'polite',
        //aria-activedescendant={activeID}
        'aria-autocomplete': 'list',
        'aria-disabled': disabled,
        'aria-readonly': readOnly,
        onKeyDown: this._keyDown,
        onClick: this._click,
        onFocus: this._focus.bind(null, true),
        onBlur: this._focus.bind(null, false),
        className: cx(className, 'rw-dropdownlist', 'rw-widget', (_cx = {}, _cx['rw-state-disabled'] = disabled, _cx['rw-state-readonly'] = readOnly, _cx['rw-state-focus'] = focused, _cx['rw-rtl'] = this.isRtl(), _cx['rw-open' + (dropUp ? '-up' : '')] = open, _cx)) }),
      React.createElement(
        'span',
        { className: 'rw-dropdownlist-picker rw-select rw-btn' },
        React.createElement(
          'i',
          { className: 'rw-i rw-i-caret-down' + (busy ? ' rw-loading' : '') },
          React.createElement(
            'span',
            { className: 'rw-sr' },
            result(messages.open, this.props)
          )
        )
      ),
      React.createElement(
        'div',
        {
          className: 'rw-input'
        },
        !valueItem && placeholder ? React.createElement(
          'span',
          { className: 'rw-placeholder' },
          placeholder
        ) : this.props.valueComponent ? React.createElement(ValueComponent, { item: valueItem }) : this._dataText(valueItem)
      ),
      React.createElement(
        Popup,
        babelHelpers._extends({}, popupProps, {
          onOpen: function () {
            return _this.focus();
          },
          onOpening: function () {
            return _this.refs.list.forceUpdate();
          },
          onRequestClose: this.close
        }),
        React.createElement(
          'div',
          null,
          filter && this._renderFilter(messages),
          shouldRenderList && React.createElement(List, babelHelpers._extends({ ref: 'list'
          }, listProps, {
            data: items,
            id: listID,
            'aria-live': open && 'polite',
            'aria-labelledby': this._id(),
            'aria-hidden': !this.props.open,
            selected: selectedItem,
            focused: open ? focusedItem : null,
            onSelect: this._onSelect,
            onMove: this._scrollTo,
            messages: {
              emptyList: data.length ? messages.emptyFilter : messages.emptyList
            } }))
        )
      )
    );
  },

  _renderFilter: function _renderFilter(messages) {
    var _this2 = this;

    return React.createElement(
      'div',
      { ref: 'filterWrapper', className: 'rw-filter-input' },
      React.createElement(
        'span',
        { className: 'rw-select rw-btn' },
        React.createElement('i', { className: 'rw-i rw-i-search' })
      ),
      React.createElement('input', { ref: 'filter', className: 'rw-input',
        placeholder: _.result(messages.filterPlaceholder, this.props),
        value: this.props.searchTerm,
        onChange: function (e) {
          return _this2.notify('onSearch', e.target.value);
        } })
    );
  },

  _focus: _.ifNotDisabled(true, function (focused, e) {
    var _this3 = this;

    this.setTimeout('focus', function () {
      if (!focused) _this3.close();

      if (focused !== _this3.state.focused) {
        _this3.notify(focused ? 'onFocus' : 'onBlur', e);
        _this3.setState({ focused: focused });
      }
    });
  }),

  _onSelect: _.ifNotDisabled(function (data) {
    this.close();
    this.notify('onSelect', data);
    this.change(data);
    this.focus(this);
  }),

  _click: _.ifNotDisabled(function (e) {
    var wrapper = this.refs.filterWrapper;

    if (!this.props.filter || !this.props.open) this.toggle();else if (!contains(compat.findDOMNode(wrapper), e.target)) this.close();

    this.notify('onClick', e);
  }),

  _keyDown: _.ifNotDisabled(function (e) {
    var _this4 = this;

    var self = this,
        key = e.key,
        alt = e.altKey,
        list = this.refs.list,
        filtering = this.props.filter,
        focusedItem = this.state.focusedItem,
        selectedItem = this.state.selectedItem,
        isOpen = this.props.open,
        closeWithFocus = function closeWithFocus() {
      _this4.close(), compat.findDOMNode(_this4).focus();
    };

    if (key === 'End') {
      if (isOpen) this.setState({ focusedItem: list.last() });else change(list.last());
      e.preventDefault();
    } else if (key === 'Home') {
      if (isOpen) this.setState({ focusedItem: list.first() });else change(list.first());
      e.preventDefault();
    } else if (key === 'Escape' && isOpen) {
      closeWithFocus();
    } else if ((key === 'Enter' || key === ' ' && !filtering) && isOpen) {
      change(this.state.focusedItem, true);
    } else if (key === 'ArrowDown') {
      if (alt) this.open();else if (isOpen) this.setState({ focusedItem: list.next(focusedItem) });else change(list.next(selectedItem));
      e.preventDefault();
    } else if (key === 'ArrowUp') {
      if (alt) closeWithFocus();else if (isOpen) this.setState({ focusedItem: list.prev(focusedItem) });else change(list.prev(selectedItem));
      e.preventDefault();
    } else if (!(this.props.filter && isOpen)) this.search(String.fromCharCode(e.keyCode), function (item) {
      isOpen ? _this4.setState({ focusedItem: item }) : change(item);
    });

    this.notify('onKeyDown', [e]);

    function change(item, fromList) {
      if (!item) return;
      fromList ? self._onSelect(item) : self.change(item);
    }
  }),

  change: function change(data) {
    if (!_.isShallowEqual(data, this.props.value)) {
      this.notify('onChange', data);
      this.notify('onSearch', '');
      this.close();
    }
  },

  focus: function focus(target) {
    var inst = target || (this.props.filter && this.props.open ? this.refs.filter : this.refs.input);

    if (activeElement() !== compat.findDOMNode(inst)) compat.findDOMNode(inst).focus();
  },

  _data: function _data() {
    return this.state.filteredData || this.props.data.concat();
  },

  search: function search(character, cb) {
    var _this5 = this;

    var word = ((this._searchTerm || '') + character).toLowerCase();

    this._searchTerm = word;

    this.setTimeout('search', function () {
      var list = _this5.refs.list,
          key = _this5.props.open ? 'focusedItem' : 'selectedItem',
          item = list.next(_this5.state[key], word);

      _this5._searchTerm = '';
      if (item) cb(item);
    }, this.props.delay);
  },

  open: function open() {
    this.notify('onToggle', true);
  },

  close: function close() {
    this.notify('onToggle', false);
  },

  toggle: function toggle() {
    this.props.open ? this.close() : this.open();
  }

});

function msgs(msgs) {
  return babelHelpers._extends({
    open: 'open dropdown',
    filterPlaceholder: '',
    emptyList: 'There are no items in this list',
    emptyFilter: 'The filter returned no results' }, msgs);
}

module.exports = createUncontrolledWidget(DropdownList, { open: 'onToggle', value: 'onChange', searchTerm: 'onSearch' });

module.exports.BaseDropdownList = DropdownList;