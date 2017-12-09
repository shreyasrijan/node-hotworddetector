'use strict';

// Event module.
const events = require('events');
// Audio recorder.
const AudioRecorder = require('node-audiorecorder');
// Snowboy, hot word detection.
const { Models, Detector } = require('snowboy');

const defaultModel = {
	file: './node_modules/snowboy/resources/snowboy.umdl',
	hotwords : 'snowboy'
};
const defaultDetector = {
	resource: './node_modules/snowboy/resources/common.res'
};

let audioRecorder,
	models,
	detector,
	detectorOptions;

/**
 * Sets up new detector instance.
 * It has to be recreated each time the detection is started or resumed as the detectors stream will close automaticly when nothing is piped to the service.
 */
let setupDetector = function(instance) {
	if (detector) {
		detector.reset();
	}
	
	// Create snowboy detector.
	detector = new Detector(detectorOptions);
	// Give through the error event.
	detector.on('error', function() {
		let error = 'HotwordDetector: Detector error.';
		if (instance.logger) {
			instance.logger.warn(error);
		}
		instance.emit('error', error);
	});
	// Give through the hotword event.
	detector.on('hotword', function(index, hotword, buffer) {
		if (instance.logger) {
			instance.logger.log('HotwordDetector; hotword detected; index: ' + index + '; hotword: ' + hotword + '.');
		}
		instance.emit('hotword', index, hotword, buffer);
	});
	// Give through the silence event.
	detector.on('silence', function() {
		instance.emit('silence');
	});
	// Give through the sound event.
	detector.on('sound', function(buffer) {
		instance.emit('sound', buffer);
	});
}

class HotwordDetector extends events.EventEmitter {
	/**
	 * Constructor of HotwordDetector class.
	 * @param {*} modelData Array of model data
	 * @param {*} detectorData Detector data
	 * @param {string} recordingProgram Program to be used to record the audio
	 * @param {*} logger Object with log, warn, and error functions
	 * @returns this
	 */
	constructor(modelData, detectorData, recordingProgram, logger) {
		super();
		
		// Store logger.
		this.logger = logger;
		
		// Create snowboy models, add each given model.
		models = new Models();
		// If no model data given add a default one.
		if (!modelData || modelData.length < 1) {
			modelData = [ defaultModel ];
		}
		for (let i = 0; i < modelData.length; i++) {
			models.add(Object.assign(defaultModel, modelData[i]));
		}
		
		// Store detector options.
		detectorOptions = Object.assign(defaultDetector, detectorData, { models: models });
		
		// Audio recorder instance.
		audioRecorder = new AudioRecorder({
			program: recordingProgram || 'rec',
			sampleRate: 16000,
			threshold: 0
		}, this.logger);
		
		if (this.logger) {
			// Log successful initialization.
			logger.log('HotwordDetector initialized.');	
		}
		
		return this;
	}
	/**
	 * Start detection.
	 * @returns this
	 */
	start() {
		setupDetector(this);
		audioRecorder.start().stream().pipe(detector);
		
		if (this.logger) {
			this.logger.log('HotwordDetector: Started detecting.');
		}
		
		return this;
	}
	/**
	 * Stop detection.
	 * @returns this
	 */
	stop() {
		audioRecorder.stop().stream().unpipe(detector);
		
		if (this.logger) {
			this.logger.log('HotwordDetector: Stopped detecting.');
		}
		
		return this;
	}
	/**
	 * Pauses detection.
	 * @returns this
	 */
	pause() {
		audioRecorder.pause().stream().unpipe(detector);
		
		if (this.logger) {
			this.logger.log('HotwordDetector: Paused detecting.');
		}
		
		return this;
	}
	/**
	 * Resumes detection.
	 * @returns this
	 */
	resume() {
		setupDetector(this);
		audioRecorder.resume().stream().pipe(detector);
		
		if (this.logger) {
			this.logger.log('HotwordDetector: Resumed detecting.');
		}
		
		return this;
	}
}

module.exports = HotwordDetector;