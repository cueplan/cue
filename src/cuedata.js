var OLD_STORAGE_FILE = 'todolists.json'
var listsFile = 'lists.json'
var dataVersionFile = 'version.json'

export default class {
  constructor (blockstack, automerge) {
    this.blockstack = blockstack
    this.automerge = automerge
    this.lists = {}
    this.loadedList = {}
  }

  fetchData () {
    this.blockstack.getFile(dataVersionFile, {decrypt: false})
    .then((contents) => {
      if (contents) {
        this.dataVersion = JSON.parse(contents || 0)
        console.log(this.dataVersion)
        if (this.dataVersion < 2) {
          return this.upgradeData()
        }
      } else {
        return this.initializeData()
      }
    })
    .then(() => {
      this.fetchVersion2Data()
    })
  }

  initializeData () {
    this.lists = { lists: [] }
    this.newList()
    this.throttledPushData()
    return this.throttledPushData.flush()
  }

  upgradeData () {
    if (this.dataVersion === 0) {
      this.dataVersion = 1
      return this.blockstack.putFile(dataVersionFile, JSON.stringify(this.dataVersion), {encrypt: false})
    } else if (this.dataVersion === 1) {
      this.lists = { lists: [] }
      return this.fetchVersion1Data()
        .then(this.upgradeOnev1List, this.initializeData)
        .then(() => {
          console.log('setting version to 2')
          this.dataVersion = 2
          return this.blockstack.putFile(dataVersionFile, JSON.stringify(this.dataVersion), {encrypt: false})
        })
    }
  }

  upgradeOnev1List (lists) {
    if (lists.lists.length === 0) {
      console.log('done upgrading')
      return Promise.resolve()
    }

    const listId = Date.now()
    this.lists.lists.push({ name: lists.lists[0].name, id: listId })
    this.listIndex = this.lists.lists.length - 1
    this.loadedList = this.automerge.init()
    this.loadedList = this.automerge.change(this.loadedList, 'Upgrade v1 list', ll => {
      ll.name = lists.lists[0].name
      ll.id = listId
      ll.todos = lists.lists[0].todos.map((t, i) => { return { id: i, text: t.text, status: t.completed ? 'completed' : 'incomplete' } })
    })

    this.throttledPushData()
    return this.throttledPushData.flush()
    .then(() => {
      lists = this.automerge.change(lists, 'upgrading', l => l.lists.splice(0, 1))
      return this.upgradeOnev1List(lists)
    })
  }

  pushData () {
    this.saved = false
    this.saving = 'Saving...'
    this.throttledPushData()
  }

  pushDataNow () {
    const encrypt = true

    console.log('pushing data: ' + JSON.stringify(this.lists))
    return this.blockstack.putFile(listsFile, JSON.stringify(this.lists), encrypt)
    .then(() => {
      this.saved = true
      this.saving = 'Saved'
      console.log('pushing list')
      return this.blockstack.putFile('/lists/' + this.lists.lists[this.listIndex].id + '.json', this.automerge.save(this.loadedList), encrypt)
    })
  }

  fetchVersion1Data () {
    const decrypt = true
    return this.blockstack.getFile(OLD_STORAGE_FILE, decrypt)
    .then((todosText) => {
      console.log(todosText)
      var lists = this.automerge.load(todosText) || this.automerge.init()
      if (typeof lists.lists === 'undefined') {
        return Promise.reject()
      }
      return Promise.resolve(lists)
    },
    () => {
      return Promise.reject()
    })
  }

  fetchVersion2Data () {
    const decrypt = true
    this.blockstack.getFile(listsFile, decrypt)
    .then((listsText) => {
      console.log(listsText)
      var lists = JSON.parse(listsText || {})
      this.listIndex = 0
      this.lists = lists

      if (typeof this.lists.collections === 'undefined') {
        this.lists.collections = { active: this.lists.lists.map((l, i) => i), archive: [] }
      }

      console.log(this.lists)
      console.log('/lists/' + this.lists.lists[this.listIndex].id + '.json')
      return this.blockstack.getFile('/lists/' + this.lists.lists[this.listIndex].id + '.json', decrypt)
    })
    .then((contents) => {
      this.loadedList = this.automerge.load(contents)
    })
  }
}
