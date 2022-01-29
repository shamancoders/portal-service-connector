module.exports = (app) => {
	app.all('/', (req, res, next) => {
		res.status(200).json({
			success: true,
			data: {
				name: app.get('name'),
				version: app.get('version')
			}
		})
	})

	clientControllers(app)

	// catch 404 and forward to error handler
	app.use((req, res, next) => {
		res.status(404).json({ success: false, error: { code: '404', message: 'function not found' } })
	})

	app.use((err, req, res, next) => {
		sendError(err, res)
	})
}

function clientControllers(app) {

	app.all('/:dbId/*', (req, res, next) => {
		next()
	})

	setRoutes(app, '/:dbId/:func/:param1/:param2/:param3', setRepoAPIFunctions)

	function setRepoAPIFunctions(req, res, next) {
		var ctl = getController(req.params.func)
		if(!ctl) {
			return next()
		}
		repoDbModel(req.params.dbId, (err, dbModel) => {
			if(!err) {
				ctl(dbModel, req, res, next, (data) => {
					if(data == undefined)
						res.json({ success: true })
					else if(data == null)
						res.json({ success: true })
					else if(data.file != undefined)
						downloadFile(data.file, req, res, next)
					else if(data.fileId != undefined)
						downloadFileId(dbModel, data.fileId, req, res, next)
					else if(data.sendFile != undefined)
						sendFile(data.sendFile, req, res, next)
					else if(data.sendFileId != undefined)
						sendFileId(dbModel, data.sendFileId, req, res, next)
					else {
						res.status(200).json({ success: true, data: data })
					}
					dbModel.free()
					
				})
			} else {
				next(err)
			}
		})
	}

	function getController(funcName) {
		var controllerName = path.join(__dirname, `../controllers`, `${funcName}.controller.js`)
		if(!fs.existsSync(controllerName)) {
			throw { code: 'Error', message: `'/${funcName}' controller function was not found` }
		} else {
			return require(controllerName)
		}
	}
}

function sendError(err, res) {
	var error = { code: '403', message: '' }
	if(typeof err == 'string') {
		error.message = err
	} else {
		error.code = err.code || err.name || 'ERROR'
		if(err.message)
			error.message = err.message
		else
			error.message = err.name || ''
	}
	res.status(403).json({ success: false, error: error })
}

function setRoutes(app, route, cb1, cb2) {
	let dizi = route.split('/:')
	let yol = ''
	dizi.forEach((e, index) => {
		if(index > 0) {
			yol += `/:${e}`
			if(cb1 != undefined && cb2 == undefined) {
				app.all(yol, cb1)
			} else if(cb1 != undefined && cb2 != undefined) {
				app.all(yol, cb1, cb2)
			}

		} else {
			yol += e
		}
	})
}

global.error = {
	param1: function(req, next) {
		next({ code: 'WRONG_PARAMETER', message: `function:[/${req.params.func}] [/:param1] is required` })
	},
	param2: function(req, next) {
		next({ code: 'WRONG_PARAMETER', message: `function:[/${req.params.func}/${req.params.param1}] [/:param2] is required` })
	},
	method: function(req, next) {
		next({ code: 'WRONG_METHOD', message: `function:${req.params.func} WRONG METHOD: ${req.method}` })
	},
	auth: function(req, next) {
		next({ code: 'AUTHENTICATION', message: `Yetki hatası` })
	},
	data: function(req, next, field) {
		if(field) {
			next({ code: 'WRONG_DATA', message: `"${field}" Yanlış ya da eksik veri` })

		} else {
			next({ code: 'WRONG_DATA', message: `Yanlış ya da eksik veri` })

		}
	}
}