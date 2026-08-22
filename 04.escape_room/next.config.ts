import os from "node:os";
import type { NextConfig } from "next";

/**
 * 폰으로 테스트할 때 쓰는 주소들(같은 와이파이의 http://192.168.x.x:3000 같은 것).
 *
 * Next 16은 개발 서버의 내부 리소스(/_next/*)에 대한 교차 출처 요청을 기본으로 막는다.
 * localhost가 아닌 주소로 열면 HTML은 오지만 스크립트가 전부 403이 되고, 그러면
 * React가 붙지 못해 "화면은 뜨는데 버튼이 하나도 안 먹는" 상태가 된다.
 *
 * 공유기가 IP를 바꿀 수 있으니 하드코딩하지 않고 켤 때마다 이 컴퓨터 주소를 읽어 온다.
 * 개발 서버에서만 쓰이는 설정이라 배포된 사이트에는 영향이 없다.
 */
function localNetworkAddresses(): string[] {
  const out: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && !net.internal) out.push(net.address);
    }
  }
  return out;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkAddresses(),
};

export default nextConfig;
