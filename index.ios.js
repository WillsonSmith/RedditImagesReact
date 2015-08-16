'use strict';

var React = require('react-native');
var REQUEST_URL = 'https://www.reddit.com/r/';
var DEFAULT_SUBREDDIT = 'aww';
var resultsCache = {
  lastSubreddit: '',
  lastRenderedImage: '',
  image_links: []
}

var {
  AppRegistry,
  StyleSheet,
  Image,
  ListView,
  TextInput,
  Text,
  View,
} = React;

var SGListView = require('react-native-sglistview');

function isAGif(url) {
  var splitUrl = url.split('.');
  var fileExtension = splitUrl[splitUrl.length - 1];
  if (fileExtension.indexOf("gif") !== -1) {
    return true;
  }
  return false;
}

function getImagesFromData(data) {

  var posts = data.data.children;
  var image_links = [];
  for (let post of posts) {
    let post_type = post.data.post_hint,
        post_url = post.data.url;
    if (post_type === "image" && post_url) {
      if (isAGif(post_url)) {
        image_links.push(post.data.thumbnail);
      } else {
        image_links.push(post_url);
      }
    }
  }
  return image_links;

}

function onDataLoadedEvent(responseData, imageSet) {
  resultsCache.lastRenderedImage = responseData.data.after;
  resultsCache.image_links.push(...imageSet);
  this.setState({
    dataSource: this.state.dataSource.cloneWithRows(resultsCache.image_links),
    loaded: true,
    loadingMore: false,
    text: 'enter subreddit'
  });
}

var RedditImagesReact = React.createClass({
  getInitialState: function() {
    return {
      dataSource: new ListView.DataSource({
        rowHasChanged: (row1, row2) => row1 !== row2,
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
    resultsCache.image_links.length = 0;
    this.setState({
      dataSource: this.state.dataSource.cloneWithRows(resultsCache.image_links)
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
      if (typeof opts.lastRendered !== "string") {
        if (imageSet[0] !== resultsCache.image_links[0]) {
          resultsCache.image_links.length = 0;
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
        <SGListView
          dataSource={this.state.dataSource}
          renderRow={this.renderImage}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={500}
          premptiveLoading={4}
          style={styles.listView}
        />
      </View>
    )
  },

  onEndReached: function() {
    if (!this.state.loadingMore) {
      this.setState({
        loadingMore: true
      });
      this.fetchData({subreddit: resultsCache.lastSubreddit, lastRendered: resultsCache.lastRenderedImage});
    }
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
        <Image
          source={{uri: image}}
          style={styles.thumbnail}
        />
      </View>
    )
  }
});

var styles = StyleSheet.create({
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
    color: '#fff'
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    backgroundColor: '#F5FCFF',
    margin: 5,
    padding: 5,
    height: 200
  },
  thumbnail: {
    flex: 1
  }
});

AppRegistry.registerComponent('RedditImagesReact', () => RedditImagesReact);
