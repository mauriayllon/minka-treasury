import { NextRequest, NextResponse } from 'next/server';
import { avalancheFuji } from 'viem/chains';
import { createMetadata, Metadata, ValidatedMetadata, ExecutionResponse } from '@sherrylinks/sdk';
import { serialize,  } from 'wagmi';
import { encodeFunctionData, TransactionSerializable } from 'viem';
import { abi as treasuryAbi } from '../../blockchain/abi';
import Web3 from 'web3';

const web3 = new Web3('https://api.avax-test.network/ext/bc/C/rpc');
const contractAddress = '0x610BDFD4408c8c9b87C3bd48e1128dF2c17301A8';
const contract = new web3.eth.Contract(treasuryAbi, contractAddress);


export async function GET(req: NextRequest) {
  try {
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const serverUrl = `${protocol}://${host}`;

    const result = await contract.methods.getActualVotation().call();
    
    const ids = result[0];
    const names = result[1];

    const dynamicOptions = ids.map((id: any, index: number) => ({
      label: names[index],
      value: id.toString(),
    }));

    const metadata: Metadata = {
      url: 'https://sherry.social',
      icon: `${serverUrl}/minka_treasury.png`,
      title: 'Minka Treasury',
      baseUrl: serverUrl,
      description: "Participate by voting on community proposals and donate to Minka's treasury.",
      actions: [
        {
          type: 'dynamic',
          label: 'Donate & Vote',
          description: 'Make your donation and vote for one of the active proposals',
          chains: { source: 'fuji' },
          path: `/api/mi-app`,
          params: [
            {
              name: 'monto',
              type: 'radio',
              label: 'Donation Amount',
              required: true,
              options: [
                { label: 'Small donation 0.01 Avax', value: 0.01, description: '0.01 AVAX' },
                { label: 'Medium donation 0.05 Avax', value: 0.05, description: '0.05 AVAX' },
                { label: 'Large donation 0.1 Avax', value: 0.1, description: '0.1 AVAX' }
              ],
          },
          {
            name: 'voto',
            label: 'Select your vote',
            type: 'select',
            required: true,
            options: dynamicOptions,
          },
          ],
        },
      ],
    };

    const validated: ValidatedMetadata = createMetadata(metadata);

    return NextResponse.json(validated, {
      headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    });
  } catch (error) {
    console.error('Error creando metadata:', error);
    return NextResponse.json({ error: 'Error al crear metadata' }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
    },
  });
}


export async function POST(req: NextRequest) {
  try {
    console.log('Petición POST recibida en /api/mi-app');
    const { searchParams } = new URL(req.url);
    const monto = searchParams.get('monto');
    const voto = searchParams.get('voto'); // Esto es el proposalId

    if (!monto || !voto) {
      return NextResponse.json(
        { error: 'Parámetros monto y voto son requeridos' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    const valueInWei = BigInt(Math.floor(parseFloat(monto) * 1e18));
    const proposalId = BigInt(voto);

    const data = encodeFunctionData({
      abi: treasuryAbi,
      functionName: 'vote',
      args: [proposalId],
    });

    const tx = {
      to: contractAddress,
      data,
      value: valueInWei,  // Aquí enviamos el monto junto con la transacción
      chainId: avalancheFuji.id,
    };

    const serialized = serialize(tx);

    const resp: ExecutionResponse = {
      serializedTransaction: serialized,
      chainId: avalancheFuji.name,
    };

    return NextResponse.json(resp, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error en petición POST:', error);
    return NextResponse.json({ error: 'Error Interno del Servidor' }, { status: 500 });
  }
}