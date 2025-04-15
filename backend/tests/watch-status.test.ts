// 視聴状態APIのテスト
import request from 'supertest';
import app from '../src/index';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('/api/watch-status', () => {
  let token: string;
  let episodeId: number;
  let animeId: number;
  let channelId: number;

  beforeAll(async () => {
    // テスト用ユーザー作成
    await prisma.user.deleteMany({ where: { email: 'test_watch_status@example.com' } });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'watchstatususer', email: 'test_watch_status@example.com', password: 'testpassword123' });
    token = res.body.token;

    // テスト用アニメ・エピソード作成
    const anime = await prisma.anime.create({
      data: { title: 'テストアニメ', syobocal_tid: '999999' }
    });
    animeId = anime.id;
    const channel = await prisma.channel.create({
      data: { name: 'テスト局', syobocal_cid: '9999', area: 'テストエリア' }
    });
    channelId = channel.id;
    const episode = await prisma.episode.create({
      data: {
        anime_id: anime.id,
        channel_id: channel.id,
        st_time: new Date(),
        ed_time: new Date(Date.now() + 30 * 60 * 1000),
        sub_title: '第1話',
        pid: 99999999,
        last_update: new Date()
      }
    });
    episodeId = episode.id;
  });

  afterAll(async () => {
    // 削除順序: userAnime→episode→anime/channel→user
    await prisma.userAnime.deleteMany({ where: { anime_id: animeId } });
    await prisma.episode.deleteMany({ where: { id: episodeId } });
    await prisma.anime.deleteMany({ where: { id: animeId } });
    await prisma.channel.deleteMany({ where: { id: channelId } });
    await prisma.user.deleteMany({ where: { email: 'test_watch_status@example.com' } });
    await prisma.$disconnect();
  });

  it('視聴中にできる', async () => {
    const res = await request(app)
      .post('/api/watch-status')
      .set('Authorization', `Bearer ${token}`)
      .send({ episodeId, watched: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // DB確認
    const userAnime = await prisma.userAnime.findFirst({ where: { anime_id: animeId } });
    expect(userAnime?.status).toBe('WATCHING');
  });

  it('未視聴に戻せる', async () => {
    const res = await request(app)
      .post('/api/watch-status')
      .set('Authorization', `Bearer ${token}`)
      .send({ episodeId, watched: false });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // DB確認
    const userAnime = await prisma.userAnime.findFirst({ where: { anime_id: animeId } });
    expect(userAnime?.status).toBe('PLANNED');
  });

  it('認証なしはエラー', async () => {
    const res = await request(app)
      .post('/api/watch-status')
      .send({ episodeId, watched: true });
    expect(res.status).toBe(401);
  });

  it('パラメータ不足はエラー', async () => {
    const res = await request(app)
      .post('/api/watch-status')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });
});