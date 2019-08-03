'use strict'
const metadata = require('../metadata/v46')('directoryName')
const StandardHandler = require('./standardHandler')
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')

const staticResourcesSrc = {}

class ResourceHandler extends StandardHandler {
  handle() {
    if (this.handlerMap[this.changeType]) {
      this.handlerMap[this.changeType].apply(this)
    }
  }

  handleAddtion() {
    if (metadata[this.type].metaFile === true) {
      this.line = this.line.replace(StandardHandler.METAFILE_SUFFIX, '')
    }

    const {
      resourcepath: srcPath,
      resource: resourceName,
    } = this.getSrcPath.apply(this)
    const [targetPath] = `${path.join(this.config.output, this.line)}`.match(
      /.*[/\\]staticresources/u
    )

    if (!Object.prototype.hasOwnProperty.call(staticResourcesSrc, srcPath)) {
      // eslint-disable-next-line no-sync
      staticResourcesSrc[srcPath] = fs.readdirSync(srcPath)
    }
    staticResourcesSrc[srcPath]
      // eslint-disable-next-line no-magic-numbers
      .filter(src => src.indexOf(resourceName) !== -1)
      .forEach(src =>
        this.promises.push(
          fse.copy(
            path.normalize(path.join(srcPath, src)),
            path.normalize(path.join(targetPath, src))
          )
        )
      )
  }

  handleModification() {
    this.handleAddtion.apply(this)
  }

  handleDeletion() {
    const {
      resourcepath: srcPath,
      resource: resourceName,
    } = this.getSrcPath.apply(this)

    // eslint-disable-next-line no-sync
    if (fs.existsSync(path.join(srcPath, resourceName))) {
      this.handleModification.apply(this)
    } else {
      super.handleDeletion()
    }
  }

  getSrcPath() {
    const [, resourcepath, resource] = path
      .join(this.config.repo, this.line)
      .match(/(?<path>.*[/\\]staticresources)\/(?<name>[^/\\]*)+/u)

    return {
      resource: path.parse(resource.replace('resource', '')).name,
      resourcepath,
    }
  }
}

module.exports = ResourceHandler