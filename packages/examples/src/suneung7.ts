import {
  createScene, plot, line, region, label, point,
} from 'gpu-math';

async function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;

  // 커스텀 테마: 흰 배경, 그리드 숨김, 축만 표시
  const scene = await createScene(canvas, {
    width: 600,
    height: 600,
    theme: {
      background: '#ffffff',
      grid: { color: '#ffffff', majorColor: '#ffffff' }, // 그리드 숨김
      axis: { color: '#333333', labelColor: 'rgba(0,0,0,0)' }, // 축 표시, 눈금 숨김
      palette: ['#222222'],
      font: { family: 'system-ui', size: 14 },
    },
  });

  // y = x² (포물선) — y축 대칭으로 동일한 범위
  scene.add(plot(x => x * x, {
    color: '#222222', lineWidth: 2.5, range: [-3, 3],
  }));

  // y = x - 2 (직선)
  scene.add(plot(x => x - 2, {
    color: '#222222', lineWidth: 2, range: [-1, 5],
  }));

  // x = 2 (수직선)
  scene.add(line([2, -5], [2, 6], { color: '#222222', lineWidth: 2 }));

  // 색칠 영역: y=x-2 (아래)와 y=x² (위) 사이, x=0 ~ x=2
  scene.add(region({
    above: x => x - 2,
    below: x => x * x,
    range: [0, 2],
    color: '#999999',
    opacity: 0.35,
  }));

  // 라벨들 — 곡선과 겹치지 않게 배치 (fontSize 2배)
  scene.add(label('O', [0, 0], { color: '#333', fontSize: 32, offset: [-26, 36] }));
  scene.add(label('y = x²', [-5.0, 5], { color: '#333', fontSize: 30, fontStyle: 'italic' }));
  scene.add(label('y = x − 2', [3.8, 1.0], { color: '#333', fontSize: 30, fontStyle: 'italic' }));
  scene.add(label('x = 2', [2.1, -4.5], { color: '#333', fontSize: 30, fontStyle: 'italic' }));

  // 원점 표시
  scene.add(point([0, 0], { color: '#333', size: 3 }));

  // PNG 다운로드 버튼 연결
  const btn1x = document.getElementById('btn1x');
  const btn2x = document.getElementById('btn2x');

  btn1x?.addEventListener('click', async () => {
    const png = await scene.exportImage();
    download(png, 'suneung7-1x.png');
  });

  btn2x?.addEventListener('click', async () => {
    const png = await scene.exportImage({ scale: 2 });
    download(png, 'suneung7-2x.png');
  });
}

function download(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

main();
