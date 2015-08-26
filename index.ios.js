'use strict';

var React = require('react-native');
var Dispatcher = require('flux').Dispatcher;
var MicroEvent = require('./microevents.js');
var REQUEST_URL = 'https://www.reddit.com/r/';
var DEFAULT_SUBREDDIT = 'aww';
var resultsCache = {
  lastSubreddit: '',
  lastRenderedImage: '',
  imageLinks: [],
  getAll: function() {
    return this.imageLinks;
  }
};

var AppDispatcher = new Dispatcher();

MicroEvent.mixin(resultsCache);

AppDispatcher.register(function(payload) {

  switch( payload.eventName ) {
    case 'load-images':
      resultsCache.imageLinks.push(...payload.data);
      resultsCache.trigger('change');
      break;
    case 'reset-images':
      resultsCache.imageLinks.length = 0;
      resultsCache.trigger('change');
      break;
  }
});

var {
  AppRegistry,
  ActivityIndicatorIOS,
  StyleSheet,
  Image,
  TouchableHighlight,
  ListView,
  TextInput,
  Text,
  View,
} = React;


var styles = StyleSheet.create({
  activityIndicator: {
    marginTop: 10
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  mainWrapper: {
    marginTop: 20,
    flex: 1
  },
  listView: {
    paddingTop: 20,
    backgroundColor: '#479ccf'
  },
  loadingPage: {
    flex: 1,
    backgroundColor: '#479ccf',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingPageText: {
    color: '#ffffff'
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: '#f5fcff',
    margin: 5,
    padding: 5,
    height: 200
  },
  thumbnail: {
    flex: 1
  }
});

var ActivityView = require('react-native-activity-view');
//var SGListView = require('react-native-sglistview');

function isAGif(url) {
  var splitUrl = url.split('.');
  var fileExtension = splitUrl[splitUrl.length - 1];
  if (fileExtension.indexOf('gif') !== -1) {
    return true;
  }
  return false;
}

function getImagesFromData(data) {

  var posts = data.data.children;
  var imageLinks = [];
  for (let post of posts) {
    let postType = post.data.post_hint,
        postUrl = post.data.url;
    if (postType === 'image' && postUrl) {
      if (isAGif(postUrl)) {
        imageLinks.push(post.data.thumbnail);
      } else {
        imageLinks.push(postUrl);
      }
    }
  }
  return imageLinks;

}

function onDataLoadedEvent(responseData, imageSet) {
  resultsCache.lastRenderedImage = responseData.data.after;
  AppDispatcher.dispatch({
    eventName: 'load-images',
    data: imageSet
  });
}

var RedditImagesReact = React.createClass({

  getInitialState: function() {
    return {
      dataSource: new ListView.DataSource({
        rowHasChanged: (row1, row2) => row1 !== row2
      }),
      loaded: false,
      loadingMore: false,
      text: 'enter subreddit'
    };
  },

  listChanged: function() {
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(resultsCache.imageLinks),
      loaded: true,
      loadingMore: false
    });
  },

  componentDidMount() {
    resultsCache.lastSubreddit = DEFAULT_SUBREDDIT;
    resultsCache.bind('change', this.listChanged);
    this.fetchData({subreddit: resultsCache.lastSubreddit, lastRendered: ''});
  },

  componentWillUnmount() {
    resultsCache.unbind('change', this.listChanged);
  },

  resetImages() {
    AppDispatcher.dispatch({
      eventName: 'reset-images'
    });
  },

  getNewSubreddit() {
    this.resetImages();
    resultsCache.lastSubreddit = this.state.text;
    this.fetchData({subreddit: this.state.text});
  },

  fetchData(opts = {}) {
    opts.subreddit = opts.subreddit || resultsCache.lastSubreddit;

    fetch(`${REQUEST_URL}${opts.subreddit}.json?after=${opts.lastRendered}`)
    .then((response) => response.json())
    .then((responseData) => {
      var imageSet = getImagesFromData(responseData);
      if (typeof opts.lastRendered !== 'string') {
        if (imageSet[0] !== resultsCache.imageLinks[0]) {
          resultsCache.imageLinks.length = 0;
          onDataLoadedEvent.call(this, responseData, imageSet);
        }
      } else {
        onDataLoadedEvent.call(this, responseData, imageSet);
      }

    })
    .done();
  },

  render() {
    if (!this.state.loaded) {
      return this.renderLoadingView();
    }
    var data = resultsCache.getAll();
    return (
      <View style={styles.mainWrapper}>
        <TextInput
          autoCapitalize='none'
          style={{height: 40}}
          selectTextOnFocus={true}
          onChangeText={(text) => this.setState({text})}
          value={this.state.text}
          multiline={false}
          onSubmitEditing={this.getNewSubreddit}
        />
        <ListView
          dataSource={this.state.dataSource}
          renderRow={this.renderImage}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={500}
          //premptiveLoading={4}
          style={styles.listView}
          renderFooter={this.renderEndLoader}
        />
      </View>
    );
  },

  onEndReached(evt) {
    if (!this.state.loadingMore) {
      this.setState({
        loadingMore: true
      });
      this.fetchData({subreddit: resultsCache.lastSubreddit, lastRendered: resultsCache.lastRenderedImage});
    }
  },

  pressImage(imageUrl) {
    ActivityView.show({
      url: imageUrl,
      imageUrl: imageUrl
    });
  },

  renderLoadingView() {
    return (
      <View style={styles.loadingPage}>
        <Text style={styles.loadingPageText}>
          Loading Images...
        </Text>
      </View>
    );
  },

  renderImage(image) {
    return (
      <View style={styles.container}>
        <TouchableHighlight style={styles.thumbnail} onPress={() => this.pressImage(image)}>
          <Image
            source={{uri: image}}
            style={styles.thumbnail}
          />
        </TouchableHighlight>
      </View>
    );
  },
  renderEndLoader() {
    return (
      <View style={styles.centered}>
      <Text style={styles.loadingPageText}>
      Loading images...
      </Text>
        <ActivityIndicatorIOS style={styles.activityIndicator} color="#ffffff" />
      </View>
    );
  }
});

AppRegistry.registerComponent('RedditImagesReact', () => RedditImagesReact);
