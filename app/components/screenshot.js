const childProcess = require('child_process');

const request  = require('request'),
      path     = require('path'),
      fs       = require('fs');

const config   = require('../config');
const utils    = require('./utils');

const {clipboard}  = require('electron');

module.exports = class {
  constructor(parent){
    this.parent    = parent;
    this.options   = parent.preferencesModule;
    this.directory = config.paths.uploads;

    if(this.options.getOption('uploadPath')){
      this.directory = this.options.getOption('uploadPath');
    }
  }

  captureFull(){

  }

  captureWindow(){

  }

  captureSelection(){
    this.execute(this.directory, (file, error) => {
      try {
        const test = fs.statSync(file);

        this.parent.setIcon('active');

        const defaultServices = config.defaults.services;
        const services        = this.options.getOption('services'); // todo: rewrite config to support url shorteners/file hosts

        let service = defaultServices.uploadService;
        let serviceModule;

        if(services && services.uploadService){
          service = services.uploadService;
        }

        if(service.substr(0, 4) == 'pomf'){
          service = service.split(':')[1];
          service = config.services['pomf'][service];
          if(service){
            serviceModule = require('./services/pomf');
            serviceModule.setPath(service.uploadPath, service.resultPath);
          }
        } else {
          serviceModule = require('./services/imgur');
        }

        serviceModule.upload(file, (result, error) => {
          if(!error){
            if(this.options.getOption('deleteOnUpload')){
              fs.unlink(file, (error) => {
                // delete screenshot
              });
            }

            if(result.link){
              clipboard.writeText(result.link);
            }

            this.parent.setIcon('default');
            this.parent.showNotification('Screenshot has been successfully uploaded and copied to your clipboard!', result.link);

            console.log('Upload successful!');
          } else {
            this.parent.setIcon('default');
            this.parent.showNotification('Unable to upload screenshot');

            console.log(error);
          }
        });
      } catch(error){
        this.parent.setIcon('default');
      }
    });
  }

  execute(dir, callback){
    const name      = utils.getTimestamp();
    const output    = `${dir}/${name}.png`;
    const command   = `screencapture -i -x ${output}`;

    console.log('Capturing selection...');

    childProcess.exec(command, (error, stdout, stderr) => {
      if(!error){
        console.log('Selection captured!')
        return callback(output);
      }
      console.log('Error while capturing!')
      return callback(null, true);
    });
  }
}