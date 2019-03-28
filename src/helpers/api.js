import Firebase from './firebase.js'

export default class {
  constructor () {
    this.firebase = new Firebase()
  }

  async listenAuthChange (callback) {
    return await this.firebase.listenAuthChange(callback)
  }

  async updateLists (lists) {
    return await this.firebase.setDocument('lists', lists)
  }

  async getLists () {
    return await this.firebase.getDocument('lists')
  }

  async onListsSnapshot (callback) {
    return this.firebase.onSnapshot('lists', callback)
  }

  async updateList (id, list) {
    return await this.firebase.setDocument(id, list)
  }

  async getList (id) {
    return await this.firebase.getDocument(id)
  }

  async onListSnapshot (id, callback) {
    return this.firebase.onSnapshot(id, callback)
  }

  async setVersion (version) {
    return await this.firebase.setDocument('version', version)
  }

  async getVersion () {
    return await this.firebase.getDocument('version')
  }

  async getUser () {
    return this.firebase.getUser()
  }

  async signUserOut () {
    return this.firebase.signUserOut()
  }

  async getListMetadata () {
    return this.firebase.getListMetadata()
  }

  async synchronizeListId (id) {
    return this.firebase.synchronizeListId(id)
  }
}
