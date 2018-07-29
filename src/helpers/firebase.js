import config from './config'
import firebase from 'firebase/app'
import 'firebase/auth'
import 'firebase/firestore'
import gravatar from 'gravatar'

// Initialize Firebase
const environment = process.env.NODE_ENV

firebase.initializeApp(config)
var db = firebase.firestore()
db.settings({ timestampsInSnapshots: true })

var convertDates = function myself (obj) {
  for (var p in obj) {
    if (obj[p] != null && typeof obj[p].toDate === 'function') {
      obj[p] = obj[p].toDate()
    } else if (obj.hasOwnProperty(p) && typeof obj[p] === 'object') {
      myself(obj[p])
    }
  }

  return obj
}

export default class {
  async isUserSignedIn () {
    if (this.authStateChanged) {
      return this.user != null
    }

    var self = this
    return new Promise(function (resolve, reject) {
      self.userSignedInObserver = firebase.auth().onAuthStateChanged((user) => {
        self.authStateChanged = true
        if (user) {
          var photoUrl = user.photoUrl
          if (photoUrl == null || photoUrl === '') {
            photoUrl = gravatar.url(user.email, {protocol: 'https'})
            user.updateProfile({ photoUrl: photoUrl })
          }
          self.user = { displayName: user.displayName, uid: user.uid, avatarUrl: photoUrl }
        } else {
          self.user = null
        }

        self.userSignedInObserver() // unsubscribe
        resolve(self.user != null)
      })
    })
  }

  getUser () {
    return this.user
  }

  async signUserOut () {
    return await firebase.auth().signOut()
  }

  async setDocument (path, contents) {
    await db.collection('environments').doc(environment).collection('users').doc(this.user.uid).collection('lists').doc(path).set(contents)
  }

  async getDocument (path) {
    return db.collection('environments').doc(environment).collection('users').doc(this.user.uid).collection('lists').doc(path).get().then(doc => {
      if (doc.exists) {
        return Promise.resolve(doc.data())
      } else {
        return Promise.resolve(null)
      }
    }).catch(err => {
      console.error(err)
      return Promise.reject(err)
    })
  }

  onSnapshot (path, callback) {
    return db.collection('environments').doc(environment).collection('users').doc(this.user.uid).collection('lists').doc(path).onSnapshot(snapshot => {
      callback(convertDates(snapshot.data()))
    })
  }
}

