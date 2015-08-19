'use strict';

var React = require('react-native');
var REQUEST_URL = 'https://www.reddit.com/r/';
var DEFAULT_SUBREDDIT = 'aww';
var resultsCache = {
  lastSubreddit: '',
  lastRenderedImage: '',
  imageLinks: []
};

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
  resultsCache.imageLinks.push(...imageSet);
  this.setState({
    dataSource: this.state.dataSource.cloneWithRows(resultsCache.imageLinks),
    loaded: true,
    loadingMore: false,
    text: 'enter subreddit'
  });
}

var RedditImagesReact = React.createClass({
  getInitialState: function() {
    return {
      dataSource: new ListView.DataSource({
        rowHasChanged: (row1, row2) => row1 !== row2
      }),
      loaded: false,
      loadingMore: false
    };
  },
  componentDidMount: function() {
    resultsCache.lastSubreddit = DEFAULT_SUBREDDIT;
    this.fetchData({subreddit: resultsCache.lastSubreddit, lastRendered: ''});
  },
  resetImages: function() {
    resultsCache.imageLinks.length = 0;
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(resultsCache.imageLinks)
    });
  },
  getNewSubreddit: function() {
    this.resetImages();
    resultsCache.lastSubreddit = this.state.text;
    this.fetchData({subreddit: this.state.text});
  },
  fetchData: function(opts = {}) {
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
  render: function() {
    if (!this.state.loaded) {
      return this.renderLoadingView();
    }

    return (
      <View style={styles.mainWrapper}>
        <TextInput
          autoCapitalize='none'
          style={{height: 40}}
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

  onEndReached: function() {
    if (!this.state.loadingMore) {
      this.setState({
        loadingMore: true
      });
      this.fetchData({subreddit: resultsCache.lastSubreddit, lastRendered: resultsCache.lastRenderedImage});
    }
  },

  pressImage: function(imageUrl) {
    ActivityView.show({
      url: imageUrl,
      imageUrl: imageUrl
    });
  },

  renderLoadingView: function() {
    return (
      <View style={styles.loadingPage}>
        <Text style={styles.loadingPageText}>
          Loading Images...
        </Text>
      </View>
    );
  },

  renderImage: function(image) {
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
  renderEndLoader: function() {
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
