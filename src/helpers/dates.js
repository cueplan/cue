var planName = function (dateOrString, referenceDate, defaultName) {
  if (typeof dateOrString === 'undefined' || dateOrString === null) {
    return defaultName
  }
  if (typeof dateOrString.toDate === 'function') {
    dateOrString = dateOrString.toDate()
  }
  var date = new Date(dateOrString)

  if (referenceDate == null) {
    return date.toLocaleDateString() + ' Plan'
  }

  var dateToCheck = new Date(referenceDate)
  if (date > dateToCheck) {
    return 'Tomorrow\'s Plan'
  }

  dateToCheck.setDate(dateToCheck.getDate() - 1)
  if (date > dateToCheck) {
    return 'Today\'s Plan'
  }

  dateToCheck.setDate(dateToCheck.getDate() - 1)
  if (date > dateToCheck) {
    return 'Yesterday\'s Plan'
  }

  return date.toLocaleDateString() + ' Plan'
}

var getTodaysDate = function (date) {
  var today = date || new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

export { planName, getTodaysDate }
