import { Engine, EventsEnum, Transition } from '@rendley/sdk';
import { useEffect, useRef, useState } from 'react';

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setPlaying] = useState(false);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    if (!canvasRef.current) {
      return;
    }

    const engine = Engine.getInstance();

    // connect sdk events with UI
    engine.events.on(EventsEnum.PLAYING, (payload) => {
      setPlaying(payload.isPlaying);
    });

    engine.events.on(EventsEnum.READY, () => {
      setLoading(false);
    });

    // initialize the sdk
    await engine.init({
      display: {
        width: 1080,
        height: 1920,
        backgroundColor: '#000000',
        view: canvasRef.current,
      },
    });

    const library = engine.getLibrary();

    // add media files to library
    // Note: they are not visible until added to the layer
    const uploadedVideos = await Promise.all([
      library.addMedia(
        'https://videos.pexels.com/video-files/2834230/2834230-hd_1080_1920_15fps.mp4'
      ),
      library.addMedia(
        'https://videos.pexels.com/video-files/4057316/4057316-uhd_1440_2732_25fps.mp4'
      ),
      library.addMedia(
        'https://videos.pexels.com/video-files/4838318/4838318-uhd_1440_2560_24fps.mp4'
      ),
    ]);

    // create layer
    const layer = engine.getTimeline().createLayer();

    // add each video to the layer
    for (let i = 0; i < uploadedVideos.length; i++) {
      const mediaDataId = uploadedVideos[i];

      if (!mediaDataId) {
        continue;
      }

      // this is how you add a clip to the layer
      await layer.addClip({
        mediaDataId: mediaDataId,
      });
    }

    const clipsIds = layer.clipsIds;
    const timeline = engine.getTimeline();
    const display = engine.getDisplay();

    // create one more layer, with highez zIndex to display the file name
    const textLayer = timeline.createLayer();

    // create text clips
    for (let clipId of clipsIds) {
      // this is how you get a clip by its id
      const clip = timeline.getClipById(clipId);
      // this is how you get the information about the media file by its id
      const mediaData = library.getMediaById(clip.mediaDataId);

      if (!clip || !mediaData) {
        continue;
      }

      // this matches the video size
      const [displayWidth, displayHeight] = display.getResolution();
      const maxTextWidth = displayWidth * 0.9; // 90%

      // position for the text to be at 80% down the screen
      const textPositionTop = displayHeight * 0.8;
      const textPositionLeft = displayWidth / 2;

      // add the text clip
      await textLayer.addClip({
        type: 'text',
        text: mediaData.filename,
        duration: clip.duration,
        startTime: clip.startTime,
        style: {
          fontSize: 64,
          color: '#FFFFFF',
          fontWeight: 'bold',
          cornerRadius: [20, 20, 20, 20],
          backgroundColor: '#000000',
          textAlign: 'center',
          wordWrapWidth: maxTextWidth,
          position: [textPositionLeft, textPositionTop],
        },
      });
    }

    // apply transitions between clips
    for (let i = 0; i < clipsIds.length - 1; i++) {
      const clipId = clipsIds[i];

      const transition = new Transition({
        startClipId: clipId,
        endClipId: clipsIds[i + 1],
        inDuration: 1,
        outDuration: 1,
        name: 'cross_fade',
        transitionSrc: `
        vec4 transition (vec2 uv) {
          return mix(
            getFromColor(uv),
            getToColor(uv),
            progress
          );
        }
        `,
      });

      // transition is applied at the layer level
      layer.addTransition(transition);
    }
  }

  // trigger play/pause
  function handleTogglePlay() {
    if (isPlaying) {
      Engine.getInstance().pause();
      return;
    }

    Engine.getInstance().play();
  }

  return (
    <div className="max-w-[70%] h-auto m-auto mt-20 flex flex-col items-center">
      {isLoading && <p className="mb-2">Loading...</p>}

      <canvas ref={canvasRef} className="w-full h-auto" />

      <div className="flex gap-1">
        <button
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onMouseDown={handleTogglePlay}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
};

export default App;
