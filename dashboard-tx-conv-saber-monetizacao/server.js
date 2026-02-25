require('dotenv').config();
const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
const CACHE_FILE = path.join(__dirname, 'cache.json');
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
const API_ENDPOINT = process.env.API_ENDPOINT;

// Validar variáveis de ambiente
if (!API_ENDPOINT) {
    console.error('❌ ERRO: API_ENDPOINT não configurado no .env');
    process.exit(1);
}

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Função para ler o cache do arquivo
async function readCache() {
    try {
        const data = await fs.readFile(CACHE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('📝 Cache não encontrado ou inválido, será criado na primeira requisição');
        return null;
    }
}

// Função para escrever no cache
async function writeCache(data) {
    try {
        const cacheData = {
            data: data,
            timestamp: new Date().getTime()
        };
        await fs.writeFile(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
        console.log('✅ Cache salvo em:', CACHE_FILE);
    } catch (error) {
        console.error('❌ Erro ao salvar cache:', error);
        throw error;
    }
}

// Função para verificar se o cache é válido
function isCacheValid(cache) {
    if (!cache || !cache.timestamp) {
        return false;
    }

    const now = new Date().getTime();
    const diff = now - cache.timestamp;

    return diff < CACHE_DURATION;
}

// Endpoint para obter dados (com cache)
app.get('/api/data', async (req, res) => {
    // Desabilitar cache do navegador para esta rota
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const forceRefresh = req.query.refresh === 'true';

        console.log('\n========================================');
        console.log('🔄 Requisição recebida para /api/data');
        console.log('🕐 Hora:', new Date().toLocaleString('pt-BR'));
        console.log('🔍 URL completa:', req.url);
        console.log('🔍 Query params:', JSON.stringify(req.query));
        console.log('🔍 req.query.refresh:', req.query.refresh);
        console.log('🔧 forceRefresh:', forceRefresh);

        // Ler cache do arquivo
        const cache = await readCache();

        console.log('📁 Cache existe?', cache !== null);
        if (cache) {
            console.log('📅 Timestamp do cache:', new Date(cache.timestamp).toLocaleString('pt-BR'));
            const now = new Date().getTime();
            const diff = now - cache.timestamp;
            const minutes = Math.round(diff / 1000 / 60);
            console.log('⏱️  Idade do cache:', minutes, 'minutos');
            console.log('✅ Cache válido?', diff < CACHE_DURATION);
        }

        // Verificar se o cache é válido E não é refresh forçado
        if (!forceRefresh && isCacheValid(cache)) {
            console.log('🎯 RETORNANDO DO CACHE!');
            const cacheAge = Math.round((new Date().getTime() - cache.timestamp) / 1000 / 60);
            console.log(`📊 Cache tem ${cacheAge} minutos`);
            console.log('========================================\n');
            return res.json({
                ...cache.data,
                fromCache: true,
                cacheAge: `${cacheAge} minutos`
            });
        }

        // Buscar da API (cache inválido OU refresh forçado)
        if (forceRefresh) {
            console.log('🌐 Atualizando cache (refresh forçado)...');
        } else {
            console.log('🌐 Cache inválido ou vazio, buscando da API externa...');
        }
        console.log('⏱️  Isso pode levar até 1 minuto...');
        console.log('🔗 Endpoint:', API_ENDPOINT);

        const fetch = (await import('node-fetch')).default;
        const response = await fetch(API_ENDPOINT);

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
        }

        const rawData = await response.json();
        console.log('📦 Dados recebidos da API externa');

        // Normalizar: API retorna array com um objeto, extrair o primeiro elemento
        const data = Array.isArray(rawData) ? rawData[0] : rawData;

        console.log('📊 Total de registros (consolidado):', data.data?.consolidado?.length || 0);

        // Validar estrutura
        if (!data || !data.data || !data.data.consolidado) {
            throw new Error('API retornou dados em formato inesperado');
        }

        // ATUALIZAR cache (nunca deletar, sempre sobrescrever)
        await writeCache(data);
        console.log('💾 Cache atualizado com sucesso');
        console.log('========================================\n');

        res.json({
            ...data,
            fromCache: false
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
        res.status(500).json({
            error: error.message,
            details: 'Erro ao buscar ou processar dados'
        });
    }
});

// Endpoint para verificar status do cache
app.get('/api/cache/status', async (req, res) => {
    try {
        const cache = await readCache();

        if (!cache) {
            return res.json({
                exists: false,
                valid: false,
                message: 'Cache não existe'
            });
        }

        const isValid = isCacheValid(cache);
        const age = Math.round((new Date().getTime() - cache.timestamp) / 1000 / 60);
        const timeUntilExpiry = Math.max(0, 30 - age);

        res.json({
            exists: true,
            valid: isValid,
            age: `${age} minutos`,
            expiresIn: `${timeUntilExpiry} minutos`,
            lastUpdate: new Date(cache.timestamp).toLocaleString('pt-BR')
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('\n🚀 Servidor iniciado!');
    console.log(`📍 Acesse: http://localhost:${PORT}`);
    console.log(`📊 API de dados: http://localhost:${PORT}/api/data`);
    console.log(`💾 Arquivo de cache: ${CACHE_FILE}`);
    console.log(`⏱️  Duração do cache: 30 minutos\n`);
});
