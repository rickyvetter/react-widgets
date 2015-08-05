'use strict';
var React = require('react')
  , dates = require('./util/dates')
  , List = require('./List')
  , compat  = require('./util/compat')
  , localizers = require('./util/configuration').locale
  , CustomPropTypes  = require('./util/propTypes')
  , _ = require('./util/_') // omit

var format = props => props.format || localizers.date.formats.time


module.exports = React.createClass({

  displayName: 'TimeList',

  propTypes: {
    value:          React.PropTypes.instanceOf(Date),
    min:            React.PropTypes.instanceOf(Date),
    max:            React.PropTypes.instanceOf(Date),
    step:           React.PropTypes.number,
    itemComponent:  CustomPropTypes.elementType,
    format:         CustomPropTypes.dateFormat,
    onSelect:       React.PropTypes.func,
    preserveDate:   React.PropTypes.bool,
    culture:        React.PropTypes.string
  },

  mixins: [
    require('./mixins/TimeoutMixin')
  ],

  getDefaultProps(){
    return {
      step:   30,
      onSelect: function(){},
      min: new Date(1900,  0,  1),
      max: new Date(2099, 11, 31),
      preserveDate: true,
      delay: 300
    }
  },

  getInitialState(){
    var data = this._dates(this.props)
      , focusedItem = this._closestDate(data, this.props.value);

    return {
      focusedItem: focusedItem || data[0],
      dates: data
    }
  },

  componentWillReceiveProps(nextProps) {
    var data = this._dates(nextProps)
      , focusedItem = this._closestDate(data, nextProps.value)
      , valChanged  = !dates.eq(nextProps.value, this.props.value, 'minutes')
      , minChanged  = !dates.eq(nextProps.min, this.props.min, 'minutes')
      , maxChanged  = !dates.eq(nextProps.max, this.props.max, 'minutes');

    if ( valChanged || minChanged || maxChanged){
      this.setState({
        focusedItem: focusedItem || data[0],
        dates: data
      })
    }
  },

  render: function(){
    var times = this.state.dates
      , date  = this._closestDate(times, this.props.value);

    return (
      <List {..._.pick(this.props, Object.keys(compat.type(List).propTypes))}
        ref="list"
        data={times}
        id={this.props.id}
        textField='label'
        valueField='date'
        selected={date}
        focused={this.state.focusedItem}
        itemComponent={this.props.itemComponent}
        onSelect={this.props.onSelect}/>
    )
  },

  _closestDate: function(times, date){
    var roundTo = 1000 * 60 * this.props.step
      , inst = null
      , label;

    if( !date) return null

    date  = new Date(Math.floor(date.getTime() / roundTo) * roundTo)
    label = dates.format(date, this.props.format, this.props.culture)

    times.some( time => {
      if( time.label === label )
        return (inst = time)
    })

    return inst
  },

  _data(){
    return this.state.dates
  },

  _dates: function(props){
    var times  = [], i = 0
      , values = this._dateValues(props)
      , start  = values.min
      , startDay = dates.date(start);

    while (dates.date(start) === startDay && dates.lte(start, values.max)) {
      i++
      times.push({ date: start, label: localizers.date.format(start, format(props), props.culture) })
      start = dates.add(start, props.step || 30, 'minutes')
    }
    return times
  },

  _dateValues: function(props){
    var value = props.value || dates.today()
      , useDate = props.preserveDate
      , min = props.min
      , max = props.max
      , start, end;

    //compare just the time regradless of whether they fall on the same day
    if(!useDate) {
      start = dates.startOf(dates.merge(new Date(), min), 'minutes')
      end   = dates.startOf(dates.merge(new Date(), max), 'minutes')

      if( dates.lte(end, start) && dates.gt(max, min, 'day'))
        end = dates.tomorrow()

      return {
        min: start,
        max: end
      }
    }

    start = dates.today()
    end = dates.tomorrow()
    //date parts are equal
    return {
      min: dates.eq(value, min, 'day') ? dates.merge(start, min) : start,
      max: dates.eq(value, max, 'day') ? dates.merge(start, max) : end
    }

  },

  _keyDown: function(e){
    var key = e.key
      , character = String.fromCharCode(e.keyCode)
      , focusedItem  = this.state.focusedItem
      , list = this.refs.list;

    if ( key === 'End' )
      this.setState({ focusedItem: list.last() })

    else if ( key === 'Home' )
      this.setState({ focusedItem: list.first() })

    else if ( key === 'Enter' )
      this.props.onSelect(focusedItem)

    else if ( key === 'ArrowDown' ) {
      e.preventDefault()
      this.setState({ focusedItem: list.next(focusedItem) })
    }
    else if ( key === 'ArrowUp' ) {
      e.preventDefault()
      this.setState({ focusedItem: list.prev(focusedItem) })
    }
    else {
      e.preventDefault()

      this.search(character, item => {
        this.setState({ focusedItem: item })
      })
    }
  },

  scrollTo(){
    this.refs.list.move
      && this.refs.list.move()
  },

  search(character, cb){
    var word = ((this._searchTerm || '') + character).toLowerCase();

    this._searchTerm = word

    this.setTimeout('search', () => {
      var list = this.refs.list
        , item = list.next(this.state.focusedItem, word);

      this._searchTerm = ''
      if (item) cb(item)

    }, this.props.delay)
  }

});
