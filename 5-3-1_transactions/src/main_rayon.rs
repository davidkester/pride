#![allow(non_snake_case)]

const KEY_SET_SIZE: usize = 251;
const ITERATIONS: u128 = 100;

use std::fs;
use std::io::Write;

use std::env;
use std::time::Instant;
use sha2::{Sha256, Digest};
use k256::{
    elliptic_curve::group::GroupEncoding,
    Scalar, ProjectivePoint
};
use rand_core::OsRng;

use rayon::prelude::*;

struct Proof {
    U: Vec<ProjectivePoint>,
    V: Vec<ProjectivePoint>,
    r: Vec<Scalar>,
    c: Vec<Scalar>,
    K: ProjectivePoint,
    lenght: usize
}

fn create_par_proof(private_keys: & [Scalar], public_keys: & [ProjectivePoint], G: ProjectivePoint, end: usize) -> Proof {

    let K = public_keys[1] * private_keys[0];
    let v = Scalar::generate_vartime(&mut OsRng);

    let proof_size = ( end * (end - 1) ) / 2;

    let mut r: Vec<Scalar> = vec![Scalar::zero(); proof_size as usize];
    let mut c: Vec<Scalar> = vec![Scalar::zero(); proof_size as usize];

    let mut R: Vec<ProjectivePoint> = vec![ProjectivePoint::identity(); proof_size as usize];
    let mut S: Vec<ProjectivePoint> = vec![ProjectivePoint::identity(); proof_size as usize];
    let mut U: Vec<ProjectivePoint> = vec![ProjectivePoint::identity(); proof_size as usize];
    let mut V: Vec<ProjectivePoint> = vec![ProjectivePoint::identity(); proof_size as usize];


    U[0] = G * private_keys[0];
    V[0] = public_keys[1];

    R[0] = G * v;
    S[0] = public_keys[1] * v;

    let mut sha256 = Sha256::new();
    let mut challenge_sum = Scalar::zero(); 
    let mut k = 1;

    for i in 0..end-1 {
        for j in i+1..end {
            //if i == j {continue;}
            if i == 0 && j == 1 {continue;}

            r[k] = Scalar::generate_vartime(&mut OsRng);
            c[k] = Scalar::generate_vartime(&mut OsRng);

            V[k] = public_keys[ i ];
            U[k] = public_keys[ j ];

            k = k + 1;
        }
    }

    R.par_iter_mut().enumerate().for_each(|(i, element)| {
        if i != 0 {
            *element = k256::lincomb(&G, &r[i], &U[i], &c[i]);
        }
    });

    S.par_iter_mut().enumerate().for_each(|(i, element)| {
        if i != 0 {
            *element = k256::lincomb(&V[i], &r[i], &K, &c[i]);
        }
    });

    for i in 0..proof_size as usize {
        sha256.update( format!("{}", hex::encode( R[i].to_bytes() ) ) );
        sha256.update( format!("{}", hex::encode( S[i].to_bytes() ) ) );
        challenge_sum = challenge_sum.add(&c[i]);
    }

    let challenge = Scalar::from_bytes_reduced( &sha256.finalize() );
    c[0] = challenge.sub(&challenge_sum);
    r[0] = v.sub(&c[0].mul(&private_keys[0]));

    let proof = Proof {
        U: U, V: V, r: r, c: c, K: K, lenght: proof_size as usize
    };

    return proof;

}


fn verify_par_proof(proof: & Proof, G: ProjectivePoint) -> bool {

    let proof_size = proof.lenght;

    let mut R: Vec<ProjectivePoint> = vec![ProjectivePoint::identity(); proof_size as usize];
    let mut S: Vec<ProjectivePoint> = vec![ProjectivePoint::identity(); proof_size as usize];

    let mut sha256 = Sha256::new();
    let mut challenge_sum = Scalar::zero(); 

    R.par_iter_mut().enumerate().for_each(|(i, element)| {
        *element = k256::lincomb(&G, &proof.r[i], &proof.U[i], &proof.c[i]);
    });

    S.par_iter_mut().enumerate().for_each(|(i, element)| {
        *element = k256::lincomb(&proof.V[i], &proof.r[i], &proof.K, &proof.c[i]);
    });
    
    for i in 0..proof_size {
        sha256.update( format!("{}", hex::encode( R[i].to_bytes() ) ) );
        sha256.update( format!("{}", hex::encode( S[i].to_bytes() ) ) );
        challenge_sum = challenge_sum.add(&proof.c[i]);
    }
    
    let challenge = Scalar::from_bytes_reduced( &sha256.finalize() );

    if !(challenge == challenge_sum){
        eprintln!("Proof returned false");
    }

    return challenge == challenge_sum;
}

fn main() {
    let G: ProjectivePoint = ProjectivePoint::generator();

    let mut private_keys: [Scalar; KEY_SET_SIZE] = [Scalar::zero(); KEY_SET_SIZE];
    let mut public_keys: [ProjectivePoint; KEY_SET_SIZE] = [ProjectivePoint::identity(); KEY_SET_SIZE];


    for n in 3..KEY_SET_SIZE {
        let mut gen_par_time = 0;
        let mut verify_par_time = 0;
        for _j in 0..ITERATIONS as usize {

            for i in 0..n as usize {
                let sk = Scalar::generate_vartime(&mut OsRng);
                private_keys[i] = sk;
                public_keys[i] = G * sk;
            };

            let start = Instant::now();
            let proof = create_par_proof(&private_keys, &public_keys, G, n);
            gen_par_time += start.elapsed().as_micros();

            let start = Instant::now();
            verify_par_proof(&proof, G);
            verify_par_time += start.elapsed().as_micros();

        }

        let data = format!("{:?},{:?},{:?}\n", n, gen_par_time / ITERATIONS, verify_par_time / ITERATIONS);
        println!("{}",data);
        
    }

    

   
}
