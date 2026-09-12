ALTER TABLE public.news_feed REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_feed;

INSERT INTO public.news_feed (external_id, headline, summary, source, url, category, impact, symbols, published_at) VALUES
('demo-1', 'Fed holds rates steady, signals one cut before year-end', 'The FOMC left the target range unchanged and flagged easing inflation. Powell stressed the committee remains data dependent.', 'Reuters', 'https://www.reuters.com', 'macro', 'high', ARRAY['DXY','US500'], now() - interval '18 minutes'),
('demo-2', 'Bitcoin reclaims $72K as ETF inflows accelerate', 'Spot ETFs posted their strongest daily net inflow in six weeks, pushing BTC through short-term resistance.', 'CoinDesk', 'https://www.coindesk.com', 'crypto', 'medium', ARRAY['BTCUSD','ETHUSD'], now() - interval '2 hours'),
('demo-3', 'Euro slips ahead of ECB commentary', 'EURUSD drifted lower in thin European trade as traders positioned for tomorrow''s policy remarks.', 'Bloomberg', 'https://www.bloomberg.com', 'fx', 'low', ARRAY['EURUSD'], now() - interval '7 hours');