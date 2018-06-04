var OLD_STORAGE_FILE = 'todolists.json'
var listsFile = 'lists.json'
var dataVersionFile = 'version.json'

export default class {
  constructor (blockstack, automerge, lodash) {
    this.blockstack = blockstack
    this.automerge = automerge
    this.lists = {}
    this.loadedList = {}
    this.throttledPushData = lodash.debounce(this.pushDataNow, 3000, { maxWait: 60000 })
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
    this.lists = {
      lists: [],
      collections: { active: [], archive: [] }
    }
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
      return this.blockstack.putFile('/lists/' + this.loadedList.id + '.json', this.automerge.save(this.loadedList), encrypt)
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
      this.lists = lists

      if (typeof this.lists.collections === 'undefined') {
        this.lists.collections = { active: this.lists.lists.map((l, i) => i), archive: [] }
      }

      console.log(this.lists)
      console.log('/lists/' + this.listMeta(0, 'active').id + '.json')
      return this.blockstack.getFile('/lists/' + this.listMeta(0, 'active').id + '.json', decrypt)
    })
    .then((contents) => {
      this.loadedList = this.automerge.load(contents)
    })
  }

  backupData () {
    var listsToBackup = []
    listsToBackup.push({
      contents: JSON.parse(JSON.stringify(this.lists)),
      encrypt: true,
      path: listsFile,
      automerge: false
    })
    listsToBackup.push({
      path: dataVersionFile,
      contents: this.dataVersion,
      encrypt: false,
      automerge: false
    })
    listsToBackup.currentList = 0

    return this.backupOneList(listsToBackup)
  }

  backupOneList (lists) {
    console.log(lists[0].contents)
    if (lists.currentList >= lists[0].contents.lists.length) {
      delete lists.currentList
      return Promise.resolve(lists)
    }

    var listPath = '/lists/' + lists[0].contents.lists[lists.currentList].id + '.json'
    return window.blockstack.getFile(listPath, {decrypt: true})
    .then((currentList) => {
      lists.push({
        contents: this.removeObjectIds(JSON.parse(JSON.stringify(window.automerge.load(currentList)))),
        encrypt: true,
        automerge: true,
        path: listPath
      })
      lists.currentList++
      return this.backupOneList(lists)
    })
  }

  removeObjectIds (obj) {
    console.log(obj)
    for (var p in obj) {
      if (p.startsWith('_objectId')) {
        delete obj[p]
      } else if (obj.hasOwnProperty(p) && typeof obj[p] === 'object') {
        this.removeObjectIds(obj[p])
      }
    }

    return obj
  }

  restoreBackup (file) {
    return this.readFile(file)
    .then((contents) => {
      var lists = JSON.parse(contents)
      return Promise.all(lists.map((l) => {
        var contents
        if (l.automerge) {
          contents = window.automerge.init()
          contents = window.automerge.save(window.automerge.change(contents, 'restoring backup', c => {
            for (var p in l.contents) {
              if (!p.startsWith('_')) {
                c[p] = l.contents[p]
              }
            }
          }))
        } else {
          contents = JSON.stringify(l.contents)
        }
        console.log(contents)
        return window.blockstack.putFile(l.path, contents, {encrypt: l.encrypt})
      }))
    })
  }

  readFile (file) {
    return new Promise((resolve, reject) => {
      var reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result)
      }
      reader.onabort = () => {
        reject(reader.result)
      }
      reader.onerror = () => {
        reject(reader.result)
      }
      reader.readAsText(file)
    })
  }

  switchLoadedList (listIndex, collection) {
    return (this.throttledPushData.flush() || Promise.resolve())
    .then(() => {
      if (listIndex === -1) {
        return Promise.reject()
      }
      const decrypt = true

      this.loadedList = this.automerge.init()
      return this.blockstack.getFile('/lists/' + this.listMeta(listIndex, collection).id + '.json', decrypt)
    })
    .then((contents) => {
      this.loadedList = this.automerge.load(contents) || this.automerge.init()
      console.log(this.loadedList)
    })
    .catch((error) => {
      console.log(error)
    })
  }

  listMeta (listIndex, collection) {
    return this.lists.lists[this.lists.collections[collection][listIndex]]
  }

  newList (listName, collection) {
    const listId = Date.now()

    this.lists.lists.push({ name: listName, id: listId })
    this.lists.collections[collection].push(this.lists.lists.length - 1)
    this.loadedList = this.automerge.init()
    this.loadedList = this.automerge.change(this.loadedList, 'New empty list', ll => {
      ll.name = listName
      ll.id = listId
      ll.todos = [ { id: 0, text: '', status: 'incomplete' } ]
    })

    this.pushData()
  }

  reorderList (oldIndex, newIndex, collection) {
    this.lists.collections[collection].splice(newIndex, 0, this.currentCollection.splice(oldIndex, 1)[0])
    this.pushData()
  }

  archiveList (listIndex, collection) {
    var archived = this.lists.collections[collection].splice(listIndex, 1)
    this.lists.collections['archive'].push(archived)
    this.pushData()
  }

  changeListName (listIndex, collection, newName) {
    this.listMeta(listIndex, collection).id = newName
    this.loadedList = window.automerge.change(this.loadedList, 'Changing list name', ll => {
      ll.name = newName
    })
    this.pushData()
  }

  // Todo Operations
  deleteTodo (todoId) {
    this.loadedList = window.automerge.change(this.loadedList, 'Delete a todo', ll => {
      ll.todos.splice(todoId, 1)
      if (ll.todos.length === 0) {
        ll.todos.splice(0, 0, { id: 0, text: '', status: 'incomplete' })
      }
    })
    this.pushData()
  }

  completeTodo (todoId, value) {
    this.loadedList = window.automerge.change(this.loadedList, 'Complete a todo', ll => {
      ll.todos[todoId].status = value ? 'completed' : 'incomplete'
    })
    this.pushData()
  }

  changeTodoText (todoId, value) {
    this.loadedList = window.automerge.change(this.loadedList, 'Change todo text', ll => {
      ll.todos[todoId].text = value
    })
    this.pushData()
  }

  insertTodoAfter (todoId, value) {
    this.loadedList = window.automerge.change(this.loadedList, 'Insert todo', ll => {
      ll.todos.splice(todoId + 1, 0, { id: ll.todos.length + 1, text: value || '', status: 'incomplete' })
    })

    this.pushData()
  }

  reorderTodos (oldIndex, newIndex) {
    this.loadedList = window.automerge.change(this.loadedList, 'Moving a todo', ll => {
      ll.todos.splice(newIndex, 0, ll.todos.splice(oldIndex, 1)[0])
    })

    this.pushData()
  }
}
